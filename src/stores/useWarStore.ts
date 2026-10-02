/**
 * Стор войн за территории.
 *
 * Модель одна: банда объявляет войну, пять минут идёт бой,
 * очки банде капают за каждую минуту участия каждого игрока,
 * умноженную на его ранг. Никаких отдельных эпизодов и
 * дискретных действий — см. warService.ts за подробностями.
 *
 * Имена fetchWars и completeExpiredWars оставлены как были,
 * потому что их вызывает App.tsx при загрузке игры.
 */

import { create } from 'zustand';
import {
  fetchActiveWars,
  fetchPlayerRankNumber,
  fetchPlayerWarPoints,
  fetchWarScores,
  isWarFinished,
  joinWar,
  leaveWar,
  settleWar,
  startWar,
  warTimeLeftMs,
  type War,
  type WarScores,
} from '../features/gangs/warService';
import { GANGS } from '../features/gangs/data/organizationsConfig';
import { usePlayerStore } from './usePlayerStore';
import { useOrganizationStore } from './useOrganizationStore';
import { useTerritoryStore } from './useTerritoryStore';

export type { War, WarScores } from '../features/gangs/warService';
export type WarStatus = War['status'];

export type DeclareResult = { ok: boolean; reason?: string };
export type ParticipateResult = { ok: boolean; reason?: string };

interface WarState {
  /** Активные войны — это и есть значки войны на карте */
  wars: War[];
  /** Счёт по каждой войне, пересчитывается тикером */
  scores: Record<number, WarScores>;
  /** id войны, в которой игрок сейчас участвует */
  participatingIn: number | null;
  /** Номер ранга игрока 1…10; 0 — ранга нет */
  myRankNumber: number;
  /** Сколько очков в минуту даёт ранг игрока. Задаётся редактором рангов */
  myWarPointsPerMin: number;
  isBusy: boolean;
  /** Последний подведённый итог — для всплывающего сообщения */
  lastResult: { warId: number; territoryId: number; winnerGangId: string | null; isTie: boolean } | null;
  /** Открытое окно участия. Живёт в сторе, потому что маркер войны
   *  лежит внутри карты, а окно — поверх неё, вне трансформации. */
  openWarId: number | null;

  /** Активные войны. Вызывается из App.tsx при старте игры. */
  fetchWars: () => Promise<void>;
  /** Подвести итоги истёкших войн. Вызывается из App.tsx при старте. */
  completeExpiredWars: () => Promise<void>;

  refreshMyRank: () => Promise<number>;
  declareWar: (territoryId: number) => Promise<DeclareResult>;
  join: (warId: number) => Promise<ParticipateResult>;
  leave: (warId: number) => Promise<ParticipateResult>;
  isParticipating: (warId: number) => boolean;
  timeLeftMs: (war: War) => number;
  getWarForTerritory: (territoryId: number) => War | undefined;
  getScore: (warId: number) => WarScores | undefined;
  /** Разовая перепроверка: итоги, счёт, список войн */
  tick: () => Promise<void>;
  startTicker: () => void;
  stopTicker: () => void;
  clearResult: () => void;
  setOpenWarId: (warId: number | null) => void;
}

let ticker: ReturnType<typeof setInterval> | null = null;

export const useWarStore = create<WarState>((set, get) => ({
  wars: [],
  scores: {},
  participatingIn: null,
  myRankNumber: 0,
  myWarPointsPerMin: 0,
  isBusy: false,
  lastResult: null,
  openWarId: null,

  setOpenWarId: (warId) => set({ openWarId: warId }),

  fetchWars: async () => {
    const wars = await fetchActiveWars();
    set({ wars });
  },

  completeExpiredWars: async () => {
    const now = Date.now();
    for (const war of get().wars) {
      if (war.status !== 'WAR_ACTIVE' || !isWarFinished(war, now)) continue;

      const result = await settleWar(war.id);
      if (result.ok) {
        set({
          lastResult: {
            warId: war.id,
            territoryId: war.territory_id,
            winnerGangId: result.winnerGangId,
            isTie: result.isTie,
          },
        });
      } else {
        // Иначе война навсегда остаётся WAR_ACTIVE, а с ней
        // территория — занятой по уникальному индексу: воевать за
        // неё будет нельзя никому. В лог идёт код отказа базы.
        console.error(`Не удалось подвести итоги войны #${war.id}:`, result.reason);
      }
    }
  },

  refreshMyRank: async () => {
    const { player } = usePlayerStore.getState();
    if (!player?.organization_id) {
      set({ myRankNumber: 0, myWarPointsPerMin: 0 });
      return 0;
    }
    const [rankNumber, pointsPerMin] = await Promise.all([
      fetchPlayerRankNumber(player.organization_id, player.organization_rank),
      fetchPlayerWarPoints(player.organization_id, player.organization_rank),
    ]);
    set({ myRankNumber: rankNumber, myWarPointsPerMin: pointsPerMin });
    return rankNumber;
  },

  declareWar: async territoryId => {
    if (get().isBusy) return { ok: false, reason: 'Подождите, предыдущее действие ещё выполняется' };

    const { player } = usePlayerStore.getState();
    const gangId = player?.organization_id;
    if (!player || !gangId) {
      return { ok: false, reason: 'Вы не состоите в банде' };
    }
    if (!GANGS.some(g => g.id === gangId)) {
      return { ok: false, reason: 'Воевать могут только уличные банды' };
    }

    set({ isBusy: true });
    try {
      // Ранг нужен только чтобы показать его в интерфейсе: сама
      // проверка «может ли этот игрок объявить войну» — в declare_war,
      // по org_members, на сервере.
      await get().refreshMyRank();

      // Стоимость войны тоже списывает declare_war, в той же
      // транзакции, что и создаёт войну. Раньше клиент платил
      // отдельным запросом после вставки, и при нехватке денег
      // война всё равно начиналась.
      const result = await startWar(player.id, territoryId);
      if (!result.ok) return { ok: false, reason: result.reason };

      // Баланс в сторе organizations устарел: списание прошло в базе.
      useOrganizationStore.getState().fetchOrganizations();

      await get().fetchWars();
      return { ok: true };
    } finally {
      set({ isBusy: false });
    }
  },

  join: async warId => {
    if (get().isBusy) return { ok: false, reason: 'Подождите, предыдущее действие ещё выполняется' };
    if (get().participatingIn === warId) return { ok: true };

    const { player } = usePlayerStore.getState();
    const gangId = player?.organization_id;
    if (!player || !gangId) return { ok: false, reason: 'Вы не состоите в банде' };

    set({ isBusy: true });
    try {
      const rankNumber = await get().refreshMyRank();
      const result = await joinWar(warId, player.id, gangId, rankNumber);
      if (!result.ok) return { ok: false, reason: result.reason };

      set({ participatingIn: warId });
      return { ok: true };
    } finally {
      set({ isBusy: false });
    }
  },

  leave: async warId => {
    const { player } = usePlayerStore.getState();
    if (!player) return { ok: false, reason: 'Игрок не найден' };

    await leaveWar(warId, player.id);
    set(state => ({
      participatingIn: state.participatingIn === warId ? null : state.participatingIn,
    }));
    return { ok: true };
  },

  isParticipating: warId => get().participatingIn === warId,

  timeLeftMs: war => warTimeLeftMs(war),

  getWarForTerritory: territoryId => get().wars.find(w => w.territory_id === territoryId),

  getScore: warId => get().scores[warId],

  tick: async () => {
    const now = Date.now();

    await get().completeExpiredWars();

    // Война кончилась — выходим из участия сами, чтобы игрок
    // не остался с открытой сессией, которая уже ничего не даёт.
    const participatingIn = get().participatingIn;
    if (participatingIn !== null) {
      const war = get().wars.find(w => w.id === participatingIn);
      if (!war || isWarFinished(war, now)) {
        await get().leave(participatingIn);
      }
    }

    await get().fetchWars();

    // Счёт пересчитываем только по идущим войнам
    const scores: Record<number, WarScores> = {};
    for (const war of get().wars) {
      scores[war.id] = await fetchWarScores(war);
    }
    set({ scores });

    // После расчёта мог смениться владелец зоны
    useTerritoryStore.getState().fetchTerritories();
  },

  startTicker: () => {
    if (ticker) return;
    // Раз в 5 секунд: очки капают поминутно, чаще считать незачем
    ticker = setInterval(() => {
      void get().tick();
    }, 5_000);
  },

  stopTicker: () => {
    if (!ticker) return;
    clearInterval(ticker);
    ticker = null;
  },

  clearResult: () => set({ lastResult: null }),
}));
