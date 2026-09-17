import { create } from 'zustand';
import { supabase } from '../services/supabase/client';
import {
  resolveEventOutcome,
  calculateWarResult,
  applyWarResultToTerritory,
  type WarOutcome,
  type WarOutcomeResult,
  calculatePlayerContribution,
} from '../game/world/warScoring';
import { useTerritoryStore } from './useTerritoryStore';
import { usePlayerStore } from './usePlayerStore';
import { type LevelledEntity, type WarAction } from '../game/world/warConfig';

const WAR_STATUSES = {
  WAR_PREPARATION: 'WAR_PREPARATION',
  WAR_ACTIVE: 'WAR_ACTIVE',
  ENDED: 'ENDED',
} as const;

const EVENT_TYPES = {
  SHOOTOUT: 'SHOOTOUT',
  AMBUSH: 'AMBUSH',
  STREET_FIGHT: 'STREET_FIGHT',
  RECON: 'RECON',
  DEFENSE: 'DEFENSE',
  ATTACK: 'ATTACK',
  SUPPLY: 'SUPPLY',
} as const;

const EVENT_RESULTS = {
  ATTACKER_WIN: 'ATTACKER_WIN',
  DEFENDER_WIN: 'DEFENDER_WIN',
  DRAW: 'DRAW',
} as const;

export type WarStatus = typeof WAR_STATUSES[keyof typeof WAR_STATUSES];
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
export type EventResult = typeof EVENT_RESULTS[keyof typeof EVENT_RESULTS];

export interface War {
  id: string | number;
  territory_id: number;
  attacker_gang_id: string;
  defender_gang_id: string;
  status: WarStatus;
  attacker_score: number;
  defender_score: number;
  started_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WarEvent {
  id: string | number;
  war_id: string | number;
  territory_id: number;
  type: EventType;
  status: string;
  attacker_gang_id: string;
  defender_gang_id: string;
  result?: EventResult | null;
  created_at?: string;
  updated_at?: string;
}

export interface WarParticipant {
  id: string | number;
  event_id: string | number;
  war_id: string | number;
  player_id: string;
  gang_id: string;
  contribution: number;
  result?: string | null;
  reward?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface WarState {
  wars: War[];
  events: WarEvent[];
  participants: WarParticipant[];
  selectedWar: War | null;
  selectedEvent: WarEvent | null;
  isLoading: boolean;

  fetchWars: (territoryId?: number) => Promise<void>;
  fetchWar: (warId: string | number) => Promise<void>;
  fetchEvents: (warId?: string | number) => Promise<void>;
  fetchParticipants: (warId?: string | number, eventId?: string | number) => Promise<void>;
  createWar: (territoryId: number, attackerGangId: string, defenderGangId: string) => Promise<War | null>;
  startWar: (warId: string | number) => Promise<boolean>;
  endWar: (warId: string | number, result: WarOutcomeResult) => Promise<boolean>;
  createEvent: (warId: string | number, territoryId: number, type: EventType, attackerGangId: string, defenderGangId: string) => Promise<WarEvent | null>;
  joinEvent: (eventId: string | number, warId: string | number, playerId: string, gangId: string) => Promise<WarParticipant | null>;
  updateEventResult: (eventId: string | number, result: EventResult) => Promise<boolean>;
  updateParticipantResult: (participantId: string | number, result: string, reward: number) => Promise<boolean>;
  getActiveWarForTerritory: (territoryId: number) => War | undefined;
  getWarEvents: (warId: string | number) => WarEvent[];
  getEventParticipants: (eventId: string | number) => WarParticipant[];
  selectWar: (warId: string | number) => void;
  selectEvent: (eventId: string | number) => void;
  resolveEvent: (eventId: string | number, warId: string | number, territoryId: number) => Promise<WarOutcome | null>;
  performPlayerAction: (eventId: string | number, warId: string | number, territoryId: number, playerId: string, gangId: string, action: WarAction) => Promise<{ success: boolean; action: WarAction; contribution: number; outcome?: WarOutcome | null }>;
  completeExpiredWars: () => Promise<void>;
}

export const useWarStore = create<WarState>((set, get) => ({
  wars: [],
  events: [],
  participants: [],
  selectedWar: null,
  selectedEvent: null,
  isLoading: false,

  fetchWars: async (territoryId) => {
    set({ isLoading: true });
    try {
      let query = supabase.from('wars').select('*');
      if (territoryId) {
        query = query.eq('territory_id', territoryId);
      }
      const { data, error } = await query;
      if (!error && data) {
        set({ wars: data });
      } else if (error) {
        console.error('Wars table may not exist:', error.message);
      }
    } catch (err) {
      console.error('Failed to fetch wars:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWar: async (warId) => {
    try {
      const { data, error } = await supabase
        .from('wars')
        .select('*')
        .eq('id', warId)
        .maybeSingle();
      if (!error && data) {
        set({ selectedWar: data });
      }
    } catch (err) {
      console.error('Failed to fetch war:', err);
    }
  },

  fetchEvents: async (warId) => {
    try {
      let query = supabase.from('war_events').select('*');
      if (warId) {
        query = query.eq('war_id', warId);
      }
      const { data, error } = await query;
      if (!error && data) {
        set({ events: data });
      } else if (error) {
        console.error('War events table may not exist:', error.message);
      }
    } catch (err) {
      console.error('Failed to fetch war events:', err);
    }
  },

  fetchParticipants: async (warId, eventId) => {
    try {
      let query = supabase.from('war_participants').select('*');
      if (warId) {
        query = query.eq('war_id', warId);
      }
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (!error && data) {
        set({ participants: data });
      } else if (error) {
        console.error('War participants table may not exist:', error.message);
      }
    } catch (err) {
      console.error('Failed to fetch war participants:', err);
    }
  },

  createWar: async (territoryId, attackerGangId, defenderGangId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('wars')
        .insert([
          {
            territory_id: territoryId,
            attacker_gang_id: attackerGangId,
            defender_gang_id: defenderGangId,
            status: WAR_STATUSES.WAR_PREPARATION,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Create war error:', error);
        return null;
      }

      if (data) {
        set(state => ({ wars: [...state.wars, data] }));
      }
      return data;
    } catch (err) {
      console.error('Failed to create war:', err);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  startWar: async (warId) => {
    const now = new Date();
    const endsAt = new Date(now.getTime() + 30 * 60 * 1000);
    const { data, error } = await supabase
      .from('wars')
      .update({
        status: WAR_STATUSES.WAR_ACTIVE,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', warId)
      .select()
      .single();

    if (error) {
      console.error('Start war error:', error);
      return false;
    }

    if (data) {
      set(state => ({
        wars: state.wars.map(w => w.id === warId ? data : w),
        selectedWar: state.selectedWar?.id === warId ? data : state.selectedWar,
      }));
    }
    return true;
  },

  endWar: async (warId, _result) => {
    const now = new Date();
    const { data, error } = await supabase
      .from('wars')
      .update({
        status: WAR_STATUSES.ENDED,
        updated_at: now.toISOString(),
      })
      .eq('id', warId)
      .select()
      .single();

    if (error) {
      console.error('End war error:', error);
      return false;
    }

    if (data) {
      set(state => ({
        wars: state.wars.map(w => w.id === warId ? data : w),
        selectedWar: state.selectedWar?.id === warId ? data : state.selectedWar,
      }));
    }
    return true;
  },

  createEvent: async (warId, territoryId, type, attackerGangId, defenderGangId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('war_events')
        .insert([
          {
            war_id: warId,
            territory_id: territoryId,
            type,
            status: 'ACTIVE',
            attacker_gang_id: attackerGangId,
            defender_gang_id: defenderGangId,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Create war event error:', error);
        return null;
      }

      if (data) {
        set(state => ({ events: [...state.events, data] }));
      }
      return data;
    } catch (err) {
      console.error('Failed to create war event:', err);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  joinEvent: async (eventId, warId, playerId, gangId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('war_participants')
        .insert([
          {
            event_id: eventId,
            war_id: warId,
            player_id: playerId,
            gang_id: gangId,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Join event error:', error);
        return null;
      }

      if (data) {
        set(state => ({ participants: [...state.participants, data] }));
      }
      return data;
    } catch (err) {
      console.error('Failed to join event:', err);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateEventResult: async (eventId, result) => {
    const { data, error } = await supabase
      .from('war_events')
      .update({ result, updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Update event result error:', error);
      return false;
    }

    if (data) {
      set(state => ({
        events: state.events.map(e => e.id === eventId ? data : e),
        selectedEvent: state.selectedEvent?.id === eventId ? data : state.selectedEvent,
      }));
    }
    return true;
  },

  updateParticipantResult: async (participantId, result, reward) => {
    const { data, error } = await supabase
      .from('war_participants')
      .update({ result, reward, updated_at: new Date().toISOString() })
      .eq('id', participantId)
      .select()
      .single();

    if (error) {
      console.error('Update participant result error:', error);
      return false;
    }

    if (data) {
      set(state => ({
        participants: state.participants.map(p => p.id === participantId ? data : p),
      }));
    }
    return true;
  },

  getActiveWarForTerritory: (territoryId) => {
    return get().wars.find(
      w => w.territory_id === territoryId && w.status === WAR_STATUSES.WAR_ACTIVE
    );
  },

  getWarEvents: (warId) => {
    return get().events.filter(e => e.war_id === warId);
  },

  getEventParticipants: (eventId) => {
    return get().participants.filter(p => p.event_id === eventId);
  },

  selectWar: (warId) => {
    const war = get().wars.find(w => w.id === warId);
    set({ selectedWar: war || null });
  },

  selectEvent: (eventId) => {
    const event = get().events.find(e => e.id === eventId);
    set({ selectedEvent: event || null });
  },

  resolveEvent: async (eventId, warId, _territoryId) => {
    const event = get().events.find(e => e.id === eventId);
    if (!event) return null;

    const attackerParticipants = get().participants.filter(
      p => p.event_id === eventId && p.gang_id === event.attacker_gang_id
    );
    const defenderParticipants = get().participants.filter(
      p => p.event_id === eventId && p.gang_id === event.defender_gang_id
    );

    const attackerLevelled: LevelledEntity[] = attackerParticipants.map(_ => ({ level: 1 }));
    const defenderLevelled: LevelledEntity[] = defenderParticipants.map(_ => ({ level: 1 }));

    const outcome = resolveEventOutcome(attackerLevelled, defenderLevelled, event.type);

    await get().updateEventResult(eventId, outcome.result);

    set(state => {
      const updatedWars = state.wars.map(w => {
        if (w.id !== warId) return w;
        const newAttackerScore = w.attacker_score + outcome.attackerScore;
        const newDefenderScore = w.defender_score + outcome.defenderScore;
        return { ...w, attacker_score: newAttackerScore, defender_score: newDefenderScore };
      });
      return { wars: updatedWars };
    });

    return outcome;
  },

  performPlayerAction: async (eventId, warId, territoryId, playerId, gangId, action) => {
    const { skills } = usePlayerStore.getState();
    const level = skills.find(s => s.skill_name === 'combat')?.value || 1;
    const contribution = calculatePlayerContribution(action, level);

    const existing = get().participants.find(
      p => p.event_id === eventId && p.player_id === playerId
    );

    if (existing) {
      await supabase
        .from('war_participants')
        .update({ contribution: existing.contribution + contribution, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      set(state => ({
        participants: state.participants.map(p =>
          p.id === existing.id ? { ...p, contribution: p.contribution + contribution } : p
        ),
      }));
    } else {
      const { data, error } = await supabase
        .from('war_participants')
        .insert([{ event_id: eventId, war_id: warId, player_id: playerId, gang_id: gangId, contribution }])
        .select()
        .single();

      if (!error && data) {
        set(state => ({ participants: [...state.participants, data] }));
      }
    }

    if (action === 'RETREAT') {
      return { success: true, action, contribution };
    }

    const outcome = await get().resolveEvent(eventId, warId, territoryId);
    return { success: true, action, contribution, outcome };
  },

  completeExpiredWars: async () => {
    const now = new Date();
    const expiredWars = get().wars.filter(
      w => w.status === WAR_STATUSES.WAR_ACTIVE && w.ends_at && new Date(w.ends_at) <= now
    );

    for (const war of expiredWars) {
      const result = calculateWarResult(war.attacker_score, war.defender_score);
      const winnerGangId = result === 'ATTACKER_WIN' ? war.attacker_gang_id : result === 'DEFENDER_WIN' ? war.defender_gang_id : null;

      await get().endWar(war.id, result);

      if (winnerGangId) {
        const territory = useTerritoryStore.getState().territories.find(t => t.id === war.territory_id);
        if (territory) {
          const updatedTerritory = applyWarResultToTerritory(territory, result, winnerGangId);
          await useTerritoryStore.getState().updateTerritory(war.territory_id, updatedTerritory);
        }
      }
    }
  },
}));

export { WAR_STATUSES, EVENT_TYPES, EVENT_RESULTS };
