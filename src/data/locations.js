const DEFAULT_LOCATIONS = [
  // ==========================================
  // 1. ГОРОДСКИЕ ОБЪЕКТЫ
  // ==========================================
  { id: 'vokzal', x: 3200, y: 5150, name: 'Вокзал', icon: '🚉', color: 'bg-blue-600', type: 'public' },
  { id: 'meriya', x: 2800, y: 4200, name: 'Мэрия', icon: '🏛️', color: 'bg-amber-600', type: 'public' },
  { id: 'showroom_ls', x: 5870, y: 4500, name: 'Premium Motors', desc: 'Официальный дилер марок Clover, Sentinel и Infernus. Лучший сервис в штате.', icon: '🏎️', color: 'bg-red-600', type: 'public' },  
  { id: 'bank_1', x: 5432, y: 4550, name: 'Банк', icon: '🏦', color: 'bg-teal-500', type: 'bank' },
  { id: 'pizzeria_1', x: 5340, y: 4625, name: 'Пиццерия "Pizza Express"', desc: 'Работа курьера: получите скутер, доставьте пиццу клиенту и вернитесь за оплатой.', icon: '🍕', color: 'bg-orange-500', type: 'job' },
  { 
    id: 'mine', 
    x: 4600, 
    y: 5000, 
    name: 'Шахта', 
    icon: '⛏️', 
    color: 'bg-orange-800', 
    type: 'public' 
  },
  { id: 'lspd', x: 5350, y: 4650, name: 'LSPD HQ', icon: '🚔', color: 'bg-blue-700', type: 'lspd' },
  { id: 'hospital_1', x: 5420, y: 4620, name: 'Больница', icon: '🏥', color: 'bg-red-600', type: 'hospital' },
  { id: 'mafia_hideout', x: 4500, y: 4800, name: 'Мафия "Коза Ностра"', icon: '🕴️', color: 'bg-red-900', type: 'mafia' },
  { 
  id: 'port_ls', 
  x: 5200, 
  y: 5800, 
  name: 'Грузовой порт', 
  icon: '⚓', 
  color: 'bg-blue-900', 
  type: 'public' 
},

  // ==========================================
  // 1.1 РАБОТЫ (профессии)
  // ==========================================
  { id: 'bus_depot', x: 5252, y: 4982, name: 'Автобусный парк', desc: 'Арендуйте автобус и выполняйте маршруты по городу.', icon: '🚌', color: 'bg-yellow-600', type: 'bus_depot' },
  { id: 'garbage_depot', x: 5200, y: 4900, name: 'Мусорная база', desc: 'Работа мусорщиком: собирайте мусор по контейнерам и вывозите на базу.', icon: '🗑️', color: 'bg-lime-700', type: 'job' },
  { id: 'taxi_park', x: 5432, y: 4522, name: 'Таксопарк', desc: 'Работа таксистом: подача к клиенту и поездка по счётчику.', icon: '🚖', color: 'bg-amber-500', type: 'job' },
  { id: 'truck_depot', x: 5158, y: 5602, name: 'Грузовой терминал', desc: 'Работа дальнобойщиком: дальние рейсы с грузом.', icon: '🚛', color: 'bg-cyan-700', type: 'job' },
  { id: 'factory', x: 4902, y: 5304, name: 'Завод "SA Industrial"', desc: 'Работа мастером на заводе: сменные наряды у станка.', icon: '🏭', color: 'bg-orange-700', type: 'job' },
  { id: 'sto_1', x: 5602, y: 4952, name: 'СТО "Wrench"', desc: 'Работа автомехаником: заказ-наряды по ремонту машин.', icon: '🔧', color: 'bg-sky-700', type: 'job' },
  { id: 'box_club', x: 5480, y: 4700, name: 'Боксерский клуб', desc: 'Выходите на ринг, сражайтесь с NPC и оттачивайте навык бокса.', icon: '🥊', color: 'bg-red-600', type: 'activity' },

  // ==========================================
  // 2. ЖИЛОЙ ФОНД (Дома)
  // ==========================================
  
  // --- ЭКОНОМ-КЛАСС (h_1 - h_167) ---
  { id: 'h_1', x: 5595, y: 4755, name: 'Дом #1', type: 'house', class: 'economy' },
  { id: 'h_2', x: 5613, y: 4755, name: 'Дом #2', type: 'house', class: 'economy' },
  { id: 'h_3', x: 5627, y: 4755, name: 'Дом #3', type: 'house', class: 'economy' },
  { id: 'h_4', x: 5644, y: 4762, name: 'Дом #4', type: 'house', class: 'economy' },
  { id: 'h_5', x: 5659, y: 4777, name: 'Дом #5', type: 'house', class: 'economy' },
  { id: 'h_6', x: 5660, y: 4794, name: 'Дом #6', type: 'house', class: 'economy' },
  { id: 'h_7', x: 5649, y: 4813, name: 'Дом #7', type: 'house', class: 'economy' },
  { id: 'h_8', x: 5624, y: 4818, name: 'Дом #8', type: 'house', class: 'economy' },
  { id: 'h_9', x: 5588, y: 4817, name: 'Дом #9', type: 'house', class: 'economy' },
  { id: 'h_10', x: 5632, y: 4837, name: 'Дом #10', type: 'house', class: 'economy' },
  { id: 'h_11', x: 5632, y: 4875, name: 'Дом #11', type: 'house', class: 'economy' },
  { id: 'h_12', x: 5491, y: 4825, name: 'Дом #12', type: 'house', class: 'economy' },
  { id: 'h_13', x: 5510, y: 4826, name: 'Дом #13', type: 'house', class: 'economy' },
  { id: 'h_14', x: 5531, y: 4826, name: 'Дом #14', type: 'house', class: 'economy' },
  { id: 'h_15', x: 5511, y: 4802, name: 'Дом #15', type: 'house', class: 'economy' },
  { id: 'h_16', x: 5491, y: 4800, name: 'Дом #16', type: 'house', class: 'economy' },
  { id: 'h_17', x: 5447, y: 4828, name: 'Дом #17', type: 'house', class: 'economy' },
  { id: 'h_18', x: 5447, y: 4800, name: 'Дом #18', type: 'house', class: 'economy' },
  { id: 'h_19', x: 5431, y: 4801, name: 'Дом #19', type: 'house', class: 'economy' },
  { id: 'h_20', x: 5431, y: 4826, name: 'Дом #20', type: 'house', class: 'economy' },
  { id: 'h_21', x: 5540, y: 4754, name: 'Дом #21', type: 'house', class: 'economy' },
  { id: 'h_22', x: 5523, y: 4757, name: 'Дом #22', type: 'house', class: 'economy' },
  { id: 'h_23', x: 5503, y: 4755, name: 'Дом #23', type: 'house', class: 'economy' },
  { id: 'h_24', x: 5486, y: 4758, name: 'Дом #24', type: 'house', class: 'economy' },
  { id: 'h_25', x: 5367, y: 4744, name: 'Дом #25', type: 'house', class: 'economy' },
  { id: 'h_26', x: 5383, y: 4752, name: 'Дом #26', type: 'house', class: 'economy' },
  { id: 'h_27', x: 5405, y: 4755, name: 'Дом #27', type: 'house', class: 'economy' },
  { id: 'h_28', x: 5354, y: 4579, name: 'Дом #28', type: 'house', class: 'economy' },
  { id: 'h_29', x: 5369, y: 4578, name: 'Дом #29', type: 'house', class: 'economy' },
  { id: 'h_30', x: 5385, y: 4577, name: 'Дом #30', type: 'house', class: 'economy' },
  { id: 'h_31', x: 5137, y: 4852, name: 'Дом #31', type: 'house', class: 'economy' },
  { id: 'h_32', x: 5180, y: 4853, name: 'Дом #32', type: 'house', class: 'economy' },
  { id: 'h_33', x: 5180, y: 4820, name: 'Дом #33', type: 'house', class: 'economy' },
  { id: 'h_34', x: 5138, y: 4817, name: 'Дом #34', type: 'house', class: 'economy' },
  { id: 'h_35', x: 5183, y: 4745, name: 'Дом #35', type: 'house', class: 'economy' },
  { id: 'h_36', x: 5135, y: 4775, name: 'Дом #36', type: 'house', class: 'economy' },
  { id: 'h_37', x: 5141, y: 4746, name: 'Дом #37', type: 'house', class: 'economy' },
  { id: 'h_38', x: 5517, y: 4477, name: 'Дом #38', type: 'house', class: 'economy' },
  { id: 'h_39', x: 5520, y: 4458, name: 'Дом #39', type: 'house', class: 'economy' },
  { id: 'h_40', x: 5522, y: 4438, name: 'Дом #40', type: 'house', class: 'economy' },
  { id: 'h_41', x: 5558, y: 4470, name: 'Дом #41', type: 'house', class: 'economy' },
  { id: 'h_42', x: 5557, y: 4449, name: 'Дом #42', type: 'house', class: 'economy' },
  { id: 'h_43', x: 5554, y: 4432, name: 'Дом #43', type: 'house', class: 'economy' },
  { id: 'h_44', x: 5553, y: 4415, name: 'Дом #44', type: 'house', class: 'economy' },
  { id: 'h_45', x: 5557, y: 4400, name: 'Дом #45', type: 'house', class: 'economy' },
  { id: 'h_46', x: 5554, y: 4382, name: 'Дом #46', type: 'house', class: 'economy' },
  { id: 'h_47', x: 5521, y: 4388, name: 'Дом #47', type: 'house', class: 'economy' },
  { id: 'h_48', x: 5826, y: 5147, name: 'Дом #48', type: 'house', class: 'economy' },
  { id: 'h_49', x: 5806, y: 5147, name: 'Дом #49', type: 'house', class: 'economy' },
  { id: 'h_50', x: 5781, y: 5152, name: 'Дом #50', type: 'house', class: 'economy' },
  { id: 'h_51', x: 5762, y: 5139, name: 'Дом #51', type: 'house', class: 'economy' },
  { id: 'h_52', x: 5767, y: 5114, name: 'Дом #52', type: 'house', class: 'economy' },
  { id: 'h_53', x: 5784, y: 5109, name: 'Дом #53', type: 'house', class: 'economy' },
  { id: 'h_54', x: 5803, y: 5109, name: 'Дом #54', type: 'house', class: 'economy' },
  { id: 'h_55', x: 5825, y: 5109, name: 'Дом #55', type: 'house', class: 'economy' },
  { id: 'h_56', x: 4968, y: 5199, name: 'Дом #56', type: 'house', class: 'economy' },
  { id: 'h_57', x: 4989, y: 5199, name: 'Дом #57', type: 'house', class: 'economy' },
  { id: 'h_58', x: 5013, y: 5200, name: 'Дом #58', type: 'house', class: 'economy' },
  { id: 'h_59', x: 5013, y: 5254, name: 'Дом #59', type: 'house', class: 'economy' },
  { id: 'h_60', x: 4989, y: 5253, name: 'Дом #60', type: 'house', class: 'economy' },
  { id: 'h_61', x: 4967, y: 5254, name: 'Дом #61', type: 'house', class: 'economy' },
  { id: 'h_62', x: 5564, y: 5152, name: 'Дом #62', type: 'house', class: 'economy' },
  { id: 'h_63', x: 5592, y: 5152, name: 'Дом #63', type: 'house', class: 'economy' },
  { id: 'h_64', x: 5613, y: 5149, name: 'Дом #64', type: 'house', class: 'economy' },
  { id: 'h_65', x: 5636, y: 5149, name: 'Дом #65', type: 'house', class: 'economy' },
  { id: 'h_66', x: 5660, y: 5150, name: 'Дом #66', type: 'house', class: 'economy' },
  { id: 'h_67', x: 5655, y: 5119, name: 'Дом #67', type: 'house', class: 'economy' },
  { id: 'h_68', x: 5634, y: 5116, name: 'Дом #68', type: 'house', class: 'economy' },
  { id: 'h_69', x: 5612, y: 5116, name: 'Дом #69', type: 'house', class: 'economy' },
  { id: 'h_70', x: 5591, y: 5113, name: 'Дом #70', type: 'house', class: 'economy' },
  { id: 'h_71', x: 5902, y: 4697, name: 'Дом #71', type: 'house', class: 'economy' },
  { id: 'h_72', x: 5905, y: 4662, name: 'Дом #72', type: 'house', class: 'economy' },
  { id: 'h_73', x: 5907, y: 4628, name: 'Дом #73', type: 'house', class: 'economy' },
  { id: 'h_74', x: 5312, y: 4384, name: 'Дом #74', type: 'house', class: 'economy' },
  { id: 'h_75', x: 5329, y: 4386, name: 'Дом #75', type: 'house', class: 'economy' },
  { id: 'h_76', x: 5351, y: 4386, name: 'Дом #76', type: 'house', class: 'economy' },
  { id: 'h_77', x: 5370, y: 4384, name: 'Дом #77', type: 'house', class: 'economy' },
  { id: 'h_78', x: 5372, y: 4351, name: 'Дом #78', type: 'house', class: 'economy' },
  { id: 'h_79', x: 5354, y: 4353, name: 'Дом #79', type: 'house', class: 'economy' },
  { id: 'h_80', x: 5332, y: 4353, name: 'Дом #80', type: 'house', class: 'economy' },
  { id: 'h_81', x: 5312, y: 4354, name: 'Дом #81', type: 'house', class: 'economy' },
  { id: 'h_82', x: 5464, y: 4351, name: 'Дом #82', type: 'house', class: 'economy' },
  { id: 'h_83', x: 5463, y: 4321, name: 'Дом #83', type: 'house', class: 'economy' },
  { id: 'h_84', x: 5602, y: 4540, name: 'Дом #84', type: 'house', class: 'economy' },
  { id: 'h_85', x: 5602, y: 4524, name: 'Дом #85', type: 'house', class: 'economy' },
  { id: 'h_86', x: 5600, y: 4506, name: 'Дом #86', type: 'house', class: 'economy' },
  { id: 'h_87', x: 5599, y: 4492, name: 'Дом #87', type: 'house', class: 'economy' },
  { id: 'h_88', x: 5600, y: 4474, name: 'Дом #88', type: 'house', class: 'economy' },
  { id: 'h_89', x: 5275, y: 4599, name: 'Дом #89', type: 'house', class: 'economy' },
  { id: 'h_90', x: 5271, y: 4583, name: 'Дом #90', type: 'house', class: 'economy' },
  { id: 'h_91', x: 5276, y: 4559, name: 'Дом #91', type: 'house', class: 'economy' },
  { id: 'h_92', x: 5274, y: 4544, name: 'Дом #92', type: 'house', class: 'economy' },
  { id: 'h_93', x: 5277, y: 4526, name: 'Дом #93', type: 'house', class: 'economy' },
  { id: 'h_94', x: 5323, y: 4471, name: 'Дом #94', type: 'house', class: 'economy' },
  { id: 'h_95', x: 5306, y: 4470, name: 'Дом #95', type: 'house', class: 'economy' },
  { id: 'h_96', x: 5270, y: 4389, name: 'Дом #96', type: 'house', class: 'economy' },
  { id: 'h_97', x: 5250, y: 4384, name: 'Дом #97', type: 'house', class: 'economy' },
  { id: 'h_98', x: 5224, y: 4381, name: 'Дом #98', type: 'house', class: 'economy' },
  { id: 'h_99', x: 5229, y: 4359, name: 'Дом #99', type: 'house', class: 'economy' },
  { id: 'h_100', x: 5255, y: 4349, name: 'Дом #100', type: 'house', class: 'economy' },
  { id: 'h_101', x: 5274, y: 4356, name: 'Дом #101', type: 'house', class: 'economy' },
  { id: 'h_102', x: 5215, y: 4293, name: 'Дом #102', type: 'house', class: 'economy' },
  { id: 'h_103', x: 5216, y: 4275, name: 'Дом #103', type: 'house', class: 'economy' },
  { id: 'h_104', x: 5219, y: 4254, name: 'Дом #104', type: 'house', class: 'economy' },
  { id: 'h_105', x: 5219, y: 4230, name: 'Дом #105', type: 'house', class: 'economy' },
  { id: 'h_106', x: 5289, y: 4084, name: 'Дом #106', type: 'house', class: 'economy' },
  { id: 'h_107', x: 5311, y: 4091, name: 'Дом #107', type: 'house', class: 'economy' },
  { id: 'h_108', x: 5336, y: 4095, name: 'Дом #108', type: 'house', class: 'economy' },
  { id: 'h_109', x: 5368, y: 4115, name: 'Дом #109', type: 'house', class: 'economy' },
  { id: 'h_110', x: 5750, y: 4222, name: 'Дом #110', type: 'house', class: 'economy' },
  { id: 'h_111', x: 5750, y: 4207, name: 'Дом #111', type: 'house', class: 'economy' },
  { id: 'h_112', x: 5752, y: 4188, name: 'Дом #112', type: 'house', class: 'economy' },
  { id: 'h_113', x: 5752, y: 4171, name: 'Дом #113', type: 'house', class: 'economy' },
  { id: 'h_114', x: 5714, y: 4134, name: 'Дом #114', type: 'house', class: 'economy' },
  { id: 'h_115', x: 5694, y: 4134, name: 'Дом #115', type: 'house', class: 'economy' },
  { id: 'h_116', x: 5676, y: 4132, name: 'Дом #116', type: 'house', class: 'economy' },
  { id: 'h_117', x: 5660, y: 4133, name: 'Дом #117', type: 'house', class: 'economy' },
  { id: 'h_118', x: 5643, y: 4126, name: 'Дом #118', type: 'house', class: 'economy' },
  { id: 'h_119', x: 5622, y: 4118, name: 'Дом #119', type: 'house', class: 'economy' },
  { id: 'h_120', x: 5562, y: 4112, name: 'Дом #120', type: 'house', class: 'economy' },
  { id: 'h_121', x: 5591, y: 4112, name: 'Дом #121', type: 'house', class: 'economy' },
  { id: 'h_122', x: 5570, y: 4159, name: 'Дом #122', type: 'house', class: 'economy' },
  { id: 'h_123', x: 5589, y: 4161, name: 'Дом #123', type: 'house', class: 'economy' },
  { id: 'h_124', x: 5611, y: 4170, name: 'Дом #124', type: 'house', class: 'economy' },
  { id: 'h_125', x: 5638, y: 4174, name: 'Дом #125', type: 'house', class: 'economy' },
  { id: 'h_126', x: 5653, y: 4170, name: 'Дом #126', type: 'house', class: 'economy' },
  { id: 'h_127', x: 5671, y: 4170, name: 'Дом #127', type: 'house', class: 'economy' },
  { id: 'h_128', x: 5635, y: 4216, name: 'Дом #128', type: 'house', class: 'economy' },
  { id: 'h_129', x: 5636, y: 4239, name: 'Дом #129', type: 'house', class: 'economy' },
  { id: 'h_130', x: 5607, y: 4239, name: 'Дом #130', type: 'house', class: 'economy' },
  { id: 'h_131', x: 5589, y: 4216, name: 'Дом #131', type: 'house', class: 'economy' },
  { id: 'h_132', x: 5575, y: 4215, name: 'Дом #132', type: 'house', class: 'economy' },
  { id: 'h_133', x: 5555, y: 4216, name: 'Дом #133', type: 'house', class: 'economy' },
  { id: 'h_134', x: 5542, y: 4236, name: 'Дом #134', type: 'house', class: 'economy' },
  { id: 'h_135', x: 5520, y: 4218, name: 'Дом #135', type: 'house', class: 'economy' },
  { id: 'h_136', x: 5505, y: 4237, name: 'Дом #136', type: 'house', class: 'economy' },
  { id: 'h_137', x: 5622, y: 4541, name: 'Дом #137', type: 'house', class: 'economy' },
  { id: 'h_138', x: 5623, y: 4524, name: 'Дом #138', type: 'house', class: 'economy' },
  { id: 'h_139', x: 5621, y: 4507, name: 'Дом #139', type: 'house', class: 'economy' },
  { id: 'h_140', x: 5621, y: 4492, name: 'Дом #140', type: 'house', class: 'economy' },
  { id: 'h_141', x: 5620, y: 4475, name: 'Дом #141', type: 'house', class: 'economy' },
  { id: 'h_142', x: 5603, y: 4407, name: 'Дом #142', type: 'house', class: 'economy' },
  { id: 'h_143', x: 5602, y: 4387, name: 'Дом #143', type: 'house', class: 'economy' },
  { id: 'h_144', x: 5352, y: 4514, name: 'Дом #144', type: 'house', class: 'economy' },
  { id: 'h_145', x: 5365, y: 4514, name: 'Дом #145', type: 'house', class: 'economy' },
  { id: 'h_146', x: 5381, y: 4514, name: 'Дом #146', type: 'house', class: 'economy' },
  { id: 'h_147', x: 5268, y: 4474, name: 'Дом #147', type: 'house', class: 'economy' },
  { id: 'h_148', x: 5226, y: 4438, name: 'Дом #148', type: 'house', class: 'economy' },
  { id: 'h_149', x: 5244, y: 4433, name: 'Дом #149', type: 'house', class: 'economy' },
  { id: 'h_150', x: 5270, y: 4436, name: 'Дом #150', type: 'house', class: 'economy' },
  { id: 'h_151', x: 5087, y: 4856, name: 'Дом #151', type: 'house', class: 'economy' },
  { id: 'h_152', x: 5091, y: 4838, name: 'Дом #152', type: 'house', class: 'economy' },
  { id: 'h_153', x: 5090, y: 4819, name: 'Дом #153', type: 'house', class: 'economy' },
  { id: 'h_154', x: 5095, y: 4800, name: 'Дом #154', type: 'house', class: 'economy' },
  { id: 'h_155', x: 5088, y: 4781, name: 'Дом #155', type: 'house', class: 'economy' },
  { id: 'h_156', x: 5089, y: 4766, name: 'Дом #156', type: 'house', class: 'economy' },
  { id: 'h_157', x: 5087, y: 4750, name: 'Дом #157', type: 'house', class: 'economy' },
  { id: 'h_158', x: 5879, y: 5102, name: 'Дом #158', type: 'house', class: 'economy' },
  { id: 'h_159', x: 5879, y: 5084, name: 'Дом #159', type: 'house', class: 'economy' },
  { id: 'h_160', x: 5879, y: 5065, name: 'Дом #160', type: 'house', class: 'economy' },
  { id: 'h_161', x: 5879, y: 5048, name: 'Дом #161', type: 'house', class: 'economy' },
  { id: 'h_162', x: 5879, y: 5033, name: 'Дом #162', type: 'house', class: 'economy' },
  { id: 'h_163', x: 5923, y: 5034, name: 'Дом #163', type: 'house', class: 'economy' },
  { id: 'h_164', x: 5923, y: 5051, name: 'Дом #164', type: 'house', class: 'economy' },
  { id: 'h_165', x: 5923, y: 5067, name: 'Дом #165', type: 'house', class: 'economy' },
  { id: 'h_166', x: 5923, y: 5084, name: 'Дом #166', type: 'house', class: 'economy' },
  { id: 'h_167', x: 5929, y: 5104, name: 'Дом #167', type: 'house', class: 'economy' },

  // --- КОМФОРТ-КЛАСС (h_168 - h_205) ---
  { id: 'h_168', x: 4202, y: 4198, name: 'Дом #168', type: 'house', class: 'comfort' },
  { id: 'h_169', x: 4232, y: 4199, name: 'Дом #169', type: 'house', class: 'comfort' },
  { id: 'h_170', x: 4232, y: 4170, name: 'Дом #170', type: 'house', class: 'comfort' },
  { id: 'h_171', x: 4202, y: 4170, name: 'Дом #171', type: 'house', class: 'comfort' },
  { id: 'h_172', x: 4286, y: 4204, name: 'Дом #172', type: 'house', class: 'comfort' },
  { id: 'h_173', x: 4286, y: 4173, name: 'Дом #173', type: 'house', class: 'comfort' },
  { id: 'h_174', x: 4335, y: 4203, name: 'Дом #174', type: 'house', class: 'comfort' },
  { id: 'h_175', x: 4335, y: 4174, name: 'Дом #175', type: 'house', class: 'comfort' },
  { id: 'h_176', x: 3319, y: 4640, name: 'Дом #176', type: 'house', class: 'comfort' },
  { id: 'h_177', x: 3440, y: 4672, name: 'Дом #177', type: 'house', class: 'comfort' },
  { id: 'h_178', x: 3494, y: 4619, name: 'Дом #178', type: 'house', class: 'comfort' },
  { id: 'h_179', x: 4061, y: 4942, name: 'Дом #179', type: 'house', class: 'comfort' },
  { id: 'h_180', x: 4010, y: 4933, name: 'Дом #180', type: 'house', class: 'comfort' },
  { id: 'h_181', x: 3963, y: 4930, name: 'Дом #181', type: 'house', class: 'comfort' },
  { id: 'h_182', x: 3885, y: 4921, name: 'Дом #182', type: 'house', class: 'comfort' },
  { id: 'h_183', x: 3848, y: 4923, name: 'Дом #183', type: 'house', class: 'comfort' },
  { id: 'h_184', x: 3707, y: 4884, name: 'Дом #184', type: 'house', class: 'comfort' },
  { id: 'h_185', x: 3736, y: 4635, name: 'Дом #185', type: 'house', class: 'comfort' },
  { id: 'h_186', x: 3736, y: 4586, name: 'Дом #186', type: 'house', class: 'comfort' },
  { id: 'h_187', x: 3810, y: 4575, name: 'Дом #187', type: 'house', class: 'comfort' },
  { id: 'h_188', x: 5918, y: 4474, name: 'Дом #188', type: 'house', class: 'comfort' },
  { id: 'h_189', x: 5918, y: 4448, name: 'Дом #189', type: 'house', class: 'comfort' },
  { id: 'h_190', x: 5917, y: 4413, name: 'Дом #190', type: 'house', class: 'comfort' },
  { id: 'h_191', x: 5918, y: 4392, name: 'Дом #191', type: 'house', class: 'comfort' },
  { id: 'h_192', x: 3741, y: 4530, name: 'Дом #192', type: 'house', class: 'comfort' },
  { id: 'h_193', x: 3244, y: 4419, name: 'Дом #193', type: 'house', class: 'comfort' },
  { id: 'h_194', x: 3298, y: 4521, name: 'Дом #194', type: 'house', class: 'comfort', entrance_id: 10}, // ID точки из roads.js, которая стоит на дороге рядом с этим домом },
  { id: 'h_195', x: 3328, y: 4481, name: 'Дом #195', type: 'house', class: 'comfort' },
  { id: 'h_196', x: 3376, y: 4452, name: 'Дом #196', type: 'house', class: 'comfort' },
  { id: 'h_197', x: 3343, y: 4383, name: 'Дом #197', type: 'house', class: 'comfort' },
  { id: 'h_198', x: 3324, y: 4323, name: 'Дом #198', type: 'house', class: 'comfort' },
  { id: 'h_199', x: 3421, y: 4410, name: 'Дом #199', type: 'house', class: 'comfort' },
  { id: 'h_200', x: 3386, y: 4259, name: 'Дом #200', type: 'house', class: 'comfort' },
  { id: 'h_201', x: 3621, y: 4284, name: 'Дом #201', type: 'house', class: 'comfort' },
  { id: 'h_202', x: 3646, y: 4269, name: 'Дом #202', type: 'house', class: 'comfort' },
  { id: 'h_203', x: 3702, y: 4200, name: 'Дом #203', type: 'house', class: 'comfort' },
  { id: 'h_204', x: 3739, y: 4165, name: 'Дом #204', type: 'house', class: 'comfort' },
  { id: 'h_205', x: 3764, y: 4126, name: 'Дом #205', type: 'house', class: 'comfort' },

  // ==========================================
  // 3. МАГАЗИНЫ И ТОРГОВЛЯ
  // ==========================================
  { id: 'shop_1', x: 5189, y: 4703, name: 'Магазин 24/7', icon: '🛒', type: 'shop', color: 'bg-blue-500' },
  { id: 'shop_2', x: 5561, y: 4869, name: 'Супермаркет', icon: '🛒', type: 'shop', color: 'bg-blue-500' },
  { id: 'shop_3', x: 5871, y: 5153, name: 'Продукты', icon: '🛒', type: 'shop', color: 'bg-blue-500' },
  { id: 'shop_4', x: 5561, y: 5118, name: 'Минимаркет', icon: '🛒', type: 'shop', color: 'bg-blue-500' },
  { id: 'shop_5', x: 5463, y: 4385, name: 'Угловой магазин', icon: '🛒', type: 'shop', color: 'bg-blue-500' },
  { id: 'clothes_1', x: 5447, y: 4432, name: 'Магазин одежды', icon: '👕', type: 'clothes', color: 'bg-pink-500' },

  // ==========================================
  // 4. ОТРАСЛЬ ОТДЫХА (БАРЫ, ОТЕЛИ)
  // ==========================================
  { id: 'bar_1', x: 5442, y: 4756, name: 'Бар "У дороги"', icon: '🍺', type: 'bar', color: 'bg-amber-600' },
  { id: 'bar_2', x: 5560, y: 5076, name: 'Паб "South"', icon: '🍺', type: 'bar', color: 'bg-amber-600' },
  { id: 'bar_3', x: 5700, y: 4205, name: 'Ночной бар', icon: '🍺', type: 'bar', color: 'bg-amber-600' },
  { id: 'bar_4', x: 5914, y: 5144, name: 'Бар "Восток"', icon: '🍺', type: 'bar', color: 'bg-amber-600' },
  { id: 'club_1', x: 5680, y: 4690, name: 'Стрип-клуб "Velvet"', desc: 'Шикарный ночной клуб с VIP-танцовщицами и бонусами репутации.', icon: '💃', type: 'nightclub', color: 'bg-pink-500' },
  { id: 'hotel_1', x: 5942, y: 4623, name: 'Отель "Las Colinas"', icon: '🏨', type: 'hotel', color: 'bg-indigo-600' },
  { id: 'hotel_2', x: 5466, y: 4288, name: 'Мотель "Jefferson"', icon: '🏨', type: 'hotel', color: 'bg-indigo-600' },
  { id: 'hotel_3', x: 4777, y: 3391, name: 'Отель "Vinewood"', icon: '🏨', type: 'hotel', color: 'bg-indigo-600' },
  { id: 'hotel_4', x: 4589, y: 3425, name: 'Отель "Rockford Hills"', icon: '🏨', type: 'hotel', color: 'bg-indigo-600' },

  // ==========================================
  // 5. ТРАНСПОРТНАЯ ИНФРАСТРУКТУРА
  // ==========================================
  { id: 'gas_1', x: 5276, y: 4855, name: 'АЗС "X-Oil"', icon: '⛽', type: 'gas', color: 'bg-yellow-500' },
  { id: 'gas_2', x: 5518, y: 5026, name: 'АЗС "East"', icon: '⛽', type: 'gas', color: 'bg-yellow-500' },
  { id: 'gas_3', x: 5597, y: 4313, name: 'АЗС "North"', icon: '⛽', type: 'gas', color: 'bg-yellow-500' },
  { id: 'gas_4', x: 5712, y: 4174, name: 'АЗС "HighWay"', icon: '⛽', type: 'gas', color: 'bg-yellow-500' },
  { id: 'gas_5', x: 5212, y: 4475, name: 'АЗС "West Side"', icon: '⛽', type: 'gas', color: 'bg-yellow-500' },
  { id: 'parking_1', x: 5533, y: 4318, name: 'Парковка Сев.', icon: '🅿️', type: 'parking', color: 'bg-slate-500' },
  { id: 'parking_2', x: 5617, y: 5082, name: 'Парковка Центр', icon: '🅿️', type: 'parking', color: 'bg-slate-500' },
  { id: 'parking_3', x: 5989, y: 4623, name: 'Парковка Вост.', icon: '🅿️', type: 'parking', color: 'bg-slate-500' },
  { id: 'parking_4', x: 5311, y: 4433, name: 'Подземный паркинг', icon: '🅿️', type: 'parking', color: 'bg-slate-500' },

  // ==========================================
  // 6. СПОРТ И СКЛАДЫ
  // ==========================================
  { id: 'gym_1', x: 5187, y: 4672, name: 'Спортзал "Muscle"', icon: '💪', type: 'gym', color: 'bg-red-500' },
  { id: 'gym_2', x: 5483, y: 4240, name: 'Фитнес-центр', icon: '💪', type: 'gym', color: 'bg-red-500' },
  { id: 'warehouse_1', x: 5618, y: 5031, name: 'Склад №1', icon: '📦', type: 'warehouse', color: 'bg-stone-600' },

  // ==========================================
  // 7. ОБРАЗОВАНИЕ И ОРУЖИЕ
  // ==========================================
  { id: 'driving_school_1', x: 5400, y: 4600, name: 'Автошкола "SA Driving"', desc: 'Получите лицензии A, B и C. Сдайте экзамены и управляйте транспортом.', icon: '🎓', type: 'driving_school', color: 'bg-green-600' },
  { id: 'gun_range_1', x: 5700, y: 4400, name: 'Тир "Iron Sight"', desc: 'Прокачайте навыки стрельбы. Магазин оружия и лицензий.', icon: '🎯', type: 'gun_range', color: 'bg-amber-700' },

  // ==========================================
  // 8. БАНКОМАТЫ
  // ==========================================
  { id: 'tuning_1', x: 5920, y: 4550, name: 'Тюнинг-мастерская', desc: 'Улучшение двигателя, подвески, тормозов и установка нитро.', icon: '🔧', type: 'tuning', color: 'bg-cyan-600' },
  { id: 'atm_1', x: 5470, y: 4530, name: 'Банкомат', icon: '🏧', type: 'atm', color: 'bg-orange-500' },
  { id: 'atm_2', x: 5200, y: 4680, name: 'Банкомат', icon: '🏧', type: 'atm', color: 'bg-orange-500' },
  { id: 'atm_3', x: 5560, y: 4900, name: 'Банкомат', icon: '🏧', type: 'atm', color: 'bg-orange-500' },

  // ==========================================
  // 9. РЫБАЛКА
  // ==========================================
  { id: 'fishing_port', x: 5450, y: 4750, name: 'Рыболовный порт', icon: '🎣', type: 'fishing_port', color: 'bg-cyan-600' },

  // ==========================================
  // 10. СЕЛЬСКОЕ ХОЗЯЙСТВО
  // ==========================================
  { id: 'farm_1', x: 4800, y: 4200, name: 'Ферма', icon: '🌾', type: 'farm', color: 'bg-green-600' },

  // ==========================================
  // 11. ПИТАНИЕ (СТОЛОВАЯ)
  // ==========================================
  { id: 'cafeteria_1', x: 5500, y: 4650, name: 'Столовая "The Bowl"', icon: '🍲', type: 'cafeteria', color: 'bg-orange-600' },

  // ==========================================
  // 12. ПРОМЫШЛЕННОСТЬ (ЗАВОД)
  // ==========================================
  { id: 'factory_1', x: 4700, y: 4500, name: 'Завод "Metal Works"', icon: '🏭', type: 'factory', color: 'bg-stone-600' },

  // ==========================================
  // 13. ПРОМЫШЛЕННОСТЬ (НЕФТЯНАЯ ВЫШКА)
  // ==========================================
  { id: 'oil_rig_1', x: 4550, y: 4350, name: 'Нефтяная вышка', icon: '🛢️', type: 'oil_rig', color: 'bg-blue-800' },

  // ==========================================
  // 13. ПРОМЫШЛЕННОСТЬ (ФАБРИКА)
  // ==========================================
  { id: 'workshop_1', x: 4600, y: 4400, name: 'Фабрика "Parts & Assembly"', icon: '⚙️', type: 'workshop', color: 'bg-blue-600' },

  // ==========================================
  // 14. ЛОГИСТИКА (ДАЛЬНОБОЙЩИК)
  // ==========================================
  { id: 'trucker_depot', x: 5400, y: 4900, name: 'Грузовой терминал "Trade Hub"', icon: '🚛', type: 'trucker', color: 'bg-cyan-700' },
];

let LOCATIONS = DEFAULT_LOCATIONS;

try {
  const saved = localStorage.getItem('road_editor_locations');
  if (saved) {
    const parsed = JSON.parse(saved);
    parsed.forEach(savedLoc => {
      const idx = LOCATIONS.findIndex(l => l.id === savedLoc.id);
      if (idx !== -1) {
        LOCATIONS[idx] = { ...LOCATIONS[idx], x: savedLoc.x, y: savedLoc.y };
      }
    });
  }
} catch {}

export { LOCATIONS };

// ВРЕМЕННЫЙ СКРИПТ ДЛЯ ПРИВЯЗКИ (Потом удалим)
import { WAYPOINTS } from './roads';
import { BUSINESS_CATEGORIES } from './businessConfig';

export const getCategory = (type) => {
  if (BUSINESS_CATEGORIES.residential.includes(type)) return 'residential';
  if (BUSINESS_CATEGORIES.business.includes(type)) return 'business';
  if (BUSINESS_CATEGORIES.municipal.includes(type)) return 'municipal';
  return 'municipal';
};

export const getLinkedLocations = () => {
  return LOCATIONS.map(loc => {
    let closestId = "1";
    let minDistance = Infinity;

    Object.entries(WAYPOINTS).forEach(([id, pt]) => {
      const dist = Math.hypot(loc.x - pt.x, loc.y - pt.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = id;
      }
    });

    return { ...loc, entrance_id: closestId, category: getCategory(loc.type) };
  });
};

const getNearestWaypoint = (x, y) => {
  let closestId = "1";
  let minDistance = Infinity;
  Object.entries(WAYPOINTS).forEach(([id, pt]) => {
    const dist = Math.hypot(x - pt.x, y - pt.y);
    if (dist < minDistance) {
      minDistance = dist;
      closestId = id;
    }
  });
  return closestId;
};

const EDITOR_LOCATIONS_KEY = 'road_editor_locations';
const LOCATION_ICONS_KEY = 'location_icons';

export { DEFAULT_LOCATIONS };

export const getSavedEditorLocations = () => {
  try {
    const raw = localStorage.getItem(EDITOR_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const loadLocationIcons = () => {
  try {
    const raw = localStorage.getItem(LOCATION_ICONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveLocationIcon = (locationId, icon) => {
  const icons = loadLocationIcons();
  if (icon) {
    icons[locationId] = icon;
  } else {
    delete icons[locationId];
  }
  localStorage.setItem(LOCATION_ICONS_KEY, JSON.stringify(icons));
  FINAL_LOCATIONS = getMergedLocations();
};

export const resetLocationIcon = (locationId) => {
  const icons = loadLocationIcons();
  delete icons[locationId];
  localStorage.setItem(LOCATION_ICONS_KEY, JSON.stringify(icons));
  FINAL_LOCATIONS = getMergedLocations();
};

export const resetAllLocationIcons = () => {
  localStorage.removeItem(LOCATION_ICONS_KEY);
  FINAL_LOCATIONS = getMergedLocations();
};

export const saveEditorLocations = (locList) => {
  // Save ALL locations to localStorage BEFORE updating DEFAULT_LOCATIONS
  // (DEFAULT_LOCATIONS is a literal in code — mutations are lost on page reload,
  //  so localStorage is the only persistent storage)
  localStorage.setItem(EDITOR_LOCATIONS_KEY, JSON.stringify(locList));

  // Update LOCATIONS in memory for immediate effect
  locList.forEach(savedLoc => {
    const baseIndex = LOCATIONS.findIndex(l => l.id === savedLoc.id);
    if (baseIndex !== -1) {
      LOCATIONS[baseIndex] = { ...LOCATIONS[baseIndex], x: savedLoc.x, y: savedLoc.y };
    }
  });

  FINAL_LOCATIONS = getMergedLocations();
};

export const resetLocationToDefault = (locationId) => {
  const defaultLoc = DEFAULT_LOCATIONS.find(l => l.id === locationId);
  if (!defaultLoc) return;

  // Reset in LOCATIONS array
  const idx = LOCATIONS.findIndex(l => l.id === locationId);
  if (idx !== -1) {
    LOCATIONS[idx] = { ...defaultLoc };
  }

  // Remove from saved editor locations in localStorage
  const saved = getSavedEditorLocations().filter(l => l.id !== locationId);
  if (saved.length) {
    localStorage.setItem(EDITOR_LOCATIONS_KEY, JSON.stringify(saved));
  } else {
    localStorage.removeItem(EDITOR_LOCATIONS_KEY);
  }

  // Reset custom icon
  const icons = loadLocationIcons();
  delete icons[locationId];
  localStorage.setItem(LOCATION_ICONS_KEY, JSON.stringify(icons));

  FINAL_LOCATIONS = getMergedLocations();
};

export const resetEditorLocations = () => {
  localStorage.removeItem(EDITOR_LOCATIONS_KEY);
  localStorage.removeItem(LOCATION_ICONS_KEY);
  LOCATIONS = DEFAULT_LOCATIONS.map(l => ({ ...l }));
  FINAL_LOCATIONS = getMergedLocations();
};

export const getMergedLocations = () => {
  const base = getLinkedLocations();
  const saved = getSavedEditorLocations();
  const icons = loadLocationIcons();
  if (!saved.length && !Object.keys(icons).length) return base;
  const baseIds = new Set(base.map(l => l.id));
  let result = base;
  if (saved.length) {
    result = result.map(l => {
      const savedLoc = saved.find(s => s.id === l.id);
      if (savedLoc) {
        return { ...l, x: savedLoc.x, y: savedLoc.y };
      }
      return l;
    });
    const newLocs = saved.filter(s => !baseIds.has(s.id)).map(l => ({ ...l, entrance_id: getNearestWaypoint(l.x, l.y) }));
    result = result.concat(newLocs);
  }
  result = result.map(l => {
    const icon = icons[l.id];
    if (icon) {
      return { ...l, icon };
    }
    return l;
  });
  return result;
};

export let FINAL_LOCATIONS = getLinkedLocations();

export const refreshFinalLocations = () => {
  FINAL_LOCATIONS = getMergedLocations();
};