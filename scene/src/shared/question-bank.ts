import type { Choice } from './state.ts'

export type QuestionCategory =
  | 'GENERAL'
  | 'SCIENCE'
  | 'TECHNOLOGY'
  | 'NATURE'
  | 'GEOGRAPHY'
  | 'HISTORY'
  | 'CULTURE'
  | 'SPACE'
  | 'EVERYDAY'
  | 'SPORTS'

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

export type BankQuestion = {
  questionId: string
  questionText: string
  answerA: string
  answerB: string
  correctSide: Choice
  category: QuestionCategory
  difficulty: QuestionDifficulty
  bankVersion: string
}

type Seed = readonly [string, string, string, Choice]
type SeedWithMeta = {
  questionText: string
  answerA: string
  answerB: string
  correctSide: Choice
  category: QuestionCategory
  difficulty: QuestionDifficulty
}

const BANK_VERSION = '2026-09-endless-1'
const seeds: SeedWithMeta[] = []

function add(category: QuestionCategory, difficulty: QuestionDifficulty, entries: Seed[]) {
  for (const [questionText, answerA, answerB, correctSide] of entries) {
    seeds.push({ questionText, answerA, answerB, correctSide, category, difficulty })
  }
}

add('SCIENCE', 'EASY', [
  ['Which planet is known as the Red Planet?', 'MARS', 'VENUS', 'A'],
  ['How many legs does a spider have?', 'SIX', 'EIGHT', 'B'],
  ['What gas do plants absorb from the air?', 'OXYGEN', 'CARBON DIOXIDE', 'B'],
  ['What is frozen water called?', 'STEAM', 'ICE', 'B'],
  ['Which organ pumps blood around the body?', 'HEART', 'LUNG', 'A'],
  ['What force pulls objects toward Earth?', 'GRAVITY', 'MAGNETISM', 'A'],
  ['What is H2O commonly called?', 'WATER', 'SALT', 'A'],
  ['Which part of a plant absorbs water?', 'ROOTS', 'PETALS', 'A'],
  ['What do bees collect from flowers?', 'NECTAR', 'SAND', 'A'],
  ['Which metal is liquid at room temperature?', 'MERCURY', 'IRON', 'A'],
  ['What is the center of an atom called?', 'NUCLEUS', 'SHELL', 'A'],
  ['Which vitamin is made with sunlight?', 'VITAMIN D', 'VITAMIN C', 'A'],
  ['What instrument measures temperature?', 'THERMOMETER', 'BAROMETER', 'A'],
  ['Which blood cells fight infection?', 'WHITE CELLS', 'RED CELLS', 'A'],
  ['What is the boiling point of water at sea level?', '100 C', '50 C', 'A'],
  ['Which state of matter has a fixed shape?', 'SOLID', 'GAS', 'A'],
  ['What do we breathe in to stay alive?', 'OXYGEN', 'HELIUM', 'A'],
  ['Which simple machine uses a wheel and rope?', 'PULLEY', 'WEDGE', 'A'],
  ['What is a baby frog called?', 'TADPOLE', 'CALF', 'A'],
  ['Which sense uses the ears?', 'HEARING', 'TASTE', 'A']
])

add('SCIENCE', 'MEDIUM', [
  ['Which particle has a negative charge?', 'ELECTRON', 'PROTON', 'A'],
  ['What is the process of plants making food?', 'PHOTOSYNTHESIS', 'FERMENTATION', 'A'],
  ['Which gas is most abundant in Earth air?', 'NITROGEN', 'OXYGEN', 'A'],
  ['What scale measures earthquake strength?', 'RICHTER', 'CELSIUS', 'A'],
  ['Which tissue connects muscle to bone?', 'TENDON', 'CARTILAGE', 'A'],
  ['What is the study of weather called?', 'METEOROLOGY', 'GEOLOGY', 'A'],
  ['Which rock forms from cooled lava?', 'IGNEOUS', 'SEDIMENTARY', 'A'],
  ['What does DNA carry?', 'GENETIC INFORMATION', 'SOUND WAVES', 'A'],
  ['Which acid is in the stomach?', 'HYDROCHLORIC ACID', 'ACETIC ACID', 'A'],
  ['What is the unit of electric current?', 'AMPERE', 'WATT', 'A'],
  ['Which gas makes bread dough rise?', 'CARBON DIOXIDE', 'OXYGEN', 'A'],
  ['What is the hardest natural mineral?', 'DIAMOND', 'QUARTZ', 'A'],
  ['Which layer protects Earth from much UV light?', 'OZONE LAYER', 'MANTLE', 'A'],
  ['What is a change from liquid to gas?', 'EVAPORATION', 'FREEZING', 'A'],
  ['Which body system includes the brain?', 'NERVOUS SYSTEM', 'DIGESTIVE SYSTEM', 'A'],
  ['What is the smallest unit of life?', 'CELL', 'TISSUE', 'A'],
  ['Which lens corrects short-sightedness?', 'CONCAVE', 'CONVEX', 'A'],
  ['What does a catalyst do?', 'SPEEDS A REACTION', 'STOPS ALL MOTION', 'A'],
  ['Which wave needs a medium to travel?', 'SOUND', 'LIGHT', 'A'],
  ['What is the pH of pure water near room temperature?', '7', '2', 'A']
])

add('GEOGRAPHY', 'EASY', [
  ['What is the largest ocean on Earth?', 'PACIFIC', 'ATLANTIC', 'A'],
  ['Which country is shaped like a boot?', 'ITALY', 'INDIA', 'A'],
  ['What is the capital of France?', 'PARIS', 'ROME', 'A'],
  ['Which continent is the Sahara in?', 'AFRICA', 'ASIA', 'A'],
  ['What is the longest river in South America?', 'AMAZON', 'NILE', 'A'],
  ['Which country has the city of Tokyo?', 'JAPAN', 'CHINA', 'A'],
  ['What is the capital of Nigeria?', 'ABUJA', 'LAGOS', 'A'],
  ['Which continent is Australia part of?', 'OCEANIA', 'EUROPE', 'A'],
  ['What is the highest mountain above sea level?', 'EVEREST', 'KILIMANJARO', 'A'],
  ['Which sea lies between Europe and Africa?', 'MEDITERRANEAN', 'CARIBBEAN', 'A'],
  ['What is the capital of Canada?', 'OTTAWA', 'TORONTO', 'A'],
  ['Which country is home to Machu Picchu?', 'PERU', 'CHILE', 'A'],
  ['What is the largest country by area?', 'RUSSIA', 'BRAZIL', 'A'],
  ['Which desert covers much of northern Africa?', 'SAHARA', 'GOBI', 'A'],
  ['What is the capital of Kenya?', 'NAIROBI', 'MOMBASA', 'A'],
  ['Which river flows through Egypt?', 'NILE', 'DANUBE', 'A'],
  ['What is the capital of Spain?', 'MADRID', 'LISBON', 'A'],
  ['Which country has the Great Barrier Reef?', 'AUSTRALIA', 'MEXICO', 'A'],
  ['What is the smallest continent by land area?', 'AUSTRALIA', 'AFRICA', 'A'],
  ['Which city is famous for canals and gondolas?', 'VENICE', 'BERLIN', 'A']
])

add('GEOGRAPHY', 'MEDIUM', [
  ['Which country has the most islands?', 'SWEDEN', 'EGYPT', 'A'],
  ['What is the capital of Iceland?', 'REYKJAVIK', 'OSLO', 'A'],
  ['Which mountain range includes the Alps?', 'EUROPE', 'SOUTH AMERICA', 'A'],
  ['Which strait separates Europe and Africa at Gibraltar?', 'GIBRALTAR STRAIT', 'BOSPHORUS', 'A'],
  ['What is the capital of South Korea?', 'SEOUL', 'BUSAN', 'A'],
  ['Which lake is the deepest in the world?', 'BAIKAL', 'VICTORIA', 'A'],
  ['What is the largest island in the Mediterranean?', 'SICILY', 'CRETE', 'A'],
  ['Which country contains the Atacama Desert?', 'CHILE', 'CANADA', 'A'],
  ['What is the capital of Argentina?', 'BUENOS AIRES', 'CORDOBA', 'A'],
  ['Which river runs through London?', 'THAMES', 'SEINE', 'A'],
  ['What is the capital of Thailand?', 'BANGKOK', 'PHUKET', 'A'],
  ['Which country is also called the Land of the Rising Sun?', 'JAPAN', 'NEPAL', 'A'],
  ['What is the largest hot desert?', 'SAHARA', 'KALAHARI', 'A'],
  ['Which European city is divided by the Danube?', 'BUDAPEST', 'DUBLIN', 'A'],
  ['What is the capital of New Zealand?', 'WELLINGTON', 'AUCKLAND', 'A'],
  ['Which country has the fjords of Geiranger?', 'NORWAY', 'POLAND', 'A'],
  ['What is the capital of Peru?', 'LIMA', 'CUSCO', 'A'],
  ['Which line divides Earth into north and south?', 'EQUATOR', 'PRIME MERIDIAN', 'A'],
  ['What is the capital of Portugal?', 'LISBON', 'PORTO', 'A'],
  ['Which country has the ancient city of Petra?', 'JORDAN', 'TURKEY', 'A']
])

add('NATURE', 'EASY', [
  ['Which animal is known as the ship of the desert?', 'HORSE', 'CAMEL', 'B'],
  ['What is a group of lions called?', 'PRIDE', 'PACK', 'A'],
  ['Which bird cannot fly but swims well?', 'PENGUIN', 'EAGLE', 'A'],
  ['What do pandas mainly eat?', 'BAMBOO', 'GRASS', 'A'],
  ['Which mammal lays eggs?', 'PLATYPUS', 'DOLPHIN', 'A'],
  ['What is a young dog called?', 'PUPPY', 'KITTEN', 'A'],
  ['Which animal has a long trunk?', 'ELEPHANT', 'GIRAFFE', 'A'],
  ['What do caterpillars become?', 'BUTTERFLIES', 'SPARROWS', 'A'],
  ['Which tree produces acorns?', 'OAK', 'PALM', 'A'],
  ['What color are most healthy leaves?', 'GREEN', 'PURPLE', 'A'],
  ['Which animal is the fastest on land?', 'CHEETAH', 'HORSE', 'A'],
  ['What is the largest living land animal?', 'ELEPHANT', 'RHINOCEROS', 'A'],
  ['Which insect makes honey?', 'BEE', 'ANT', 'A'],
  ['What do fish use to breathe underwater?', 'GILLS', 'LUNGS', 'A'],
  ['Which animal is famous for changing color?', 'CHAMELEON', 'ZEBRA', 'A'],
  ['What is a baby cat called?', 'KITTEN', 'FOAL', 'A'],
  ['Which animal has black and white stripes?', 'ZEBRA', 'TIGER', 'A'],
  ['What do oak trees grow from?', 'ACORNS', 'PINEAPPLES', 'A'],
  ['Which animal is known for building dams?', 'BEAVER', 'OTTER', 'A'],
  ['What is the process by which seeds sprout?', 'GERMINATION', 'HIBERNATION', 'A']
])

add('NATURE', 'MEDIUM', [
  ['Which biome has very little rainfall?', 'DESERT', 'RAINFOREST', 'A'],
  ['What is the largest species of shark?', 'WHALE SHARK', 'GREAT WHITE', 'A'],
  ['Which animal migrates in huge herds across the Serengeti?', 'WILDEBEEST', 'KOALA', 'A'],
  ['What is a group of crows called?', 'MURDER', 'SCHOOL', 'A'],
  ['Which plant traps insects in a cup-like leaf?', 'PITCHER PLANT', 'FERN', 'A'],
  ['What is the main food of a koala?', 'EUCALYPTUS', 'BAMBOO', 'A'],
  ['Which reptile has a hard shell and can retract its head?', 'TURTLE', 'IGUANA', 'A'],
  ['What is a young horse called?', 'FOAL', 'CALF', 'A'],
  ['Which ocean animal has eight arms?', 'OCTOPUS', 'SQUID', 'A'],
  ['What do nocturnal animals do mostly?', 'ACTIVE AT NIGHT', 'SLEEP AT NIGHT', 'A'],
  ['Which tree keeps needles all year?', 'EVERGREEN', 'WILLOW', 'A'],
  ['What is the seasonal sleep of some animals?', 'HIBERNATION', 'MIGRATION', 'A'],
  ['Which animal uses echolocation?', 'BAT', 'RABBIT', 'A'],
  ['What is the largest penguin species?', 'EMPEROR', 'MACARONI', 'A'],
  ['Which flower is commonly associated with Japan?', 'CHERRY BLOSSOM', 'DAISY', 'A'],
  ['What kind of animal is a Komodo dragon?', 'LIZARD', 'SNAKE', 'A'],
  ['Which habitat is dominated by grasses and few trees?', 'SAVANNA', 'TUNDRA', 'A'],
  ['What is the protective outer layer of a tree called?', 'BARK', 'BLOOM', 'A'],
  ['Which marine mammal is known for singing?', 'HUMPBACK WHALE', 'SEAL', 'A'],
  ['What is a group of fish called?', 'SCHOOL', 'PRIDE', 'A']
])

add('HISTORY', 'EASY', [
  ['Which ancient people built the pyramids at Giza?', 'EGYPTIANS', 'VIKINGS', 'A'],
  ['Who was the first person to walk on the Moon?', 'NEIL ARMSTRONG', 'YURI GAGARIN', 'A'],
  ['Which empire used roads across much of Europe?', 'ROMAN', 'MONGOL', 'A'],
  ['What material did ancient Egyptians use for writing?', 'PAPYRUS', 'SILK', 'A'],
  ['Which city was buried by Mount Vesuvius?', 'POMPEII', 'SPARTA', 'A'],
  ['Who wrote the Declaration of Independence in the US?', 'THOMAS JEFFERSON', 'ABRAHAM LINCOLN', 'A'],
  ['Which civilization built Machu Picchu?', 'INCA', 'MAYA', 'A'],
  ['What was the name of the ship on which the Pilgrims sailed?', 'MAYFLOWER', 'ENDEAVOUR', 'A'],
  ['Which ancient city had the Colosseum?', 'ROME', 'ATHENS', 'A'],
  ['Who painted the Mona Lisa?', 'LEONARDO DA VINCI', 'MICHELANGELO', 'A'],
  ['Which war ended with the Treaty of Versailles?', 'WORLD WAR I', 'WORLD WAR II', 'A'],
  ['What was the Silk Road mainly used for?', 'TRADE', 'FARMING', 'A'],
  ['Which queen ruled ancient Egypt with Julius Caesar?', 'CLEOPATRA', 'BOUDICA', 'A'],
  ['Who discovered penicillin?', 'ALEXANDER FLEMING', 'LOUIS PASTEUR', 'A'],
  ['Which ancient Greek city held the first Olympics?', 'OLYMPIA', 'SPARTA', 'A'],
  ['What was the name of the medieval plague?', 'BLACK DEATH', 'RED FEVER', 'A'],
  ['Which explorer reached the Americas in 1492?', 'CHRISTOPHER COLUMBUS', 'FERDINAND MAGELLAN', 'A'],
  ['What did the Wright brothers achieve?', 'POWERED FLIGHT', 'STEAM ENGINE', 'A'],
  ['Which document limited the English king in 1215?', 'MAGNA CARTA', 'DOMESDAY BOOK', 'A'],
  ['Who was known as the Maid of Orléans?', 'JOAN OF ARC', 'MARIE CURIE', 'A']
])

add('HISTORY', 'MEDIUM', [
  ['Which civilization developed cuneiform writing?', 'SUMER', 'INCA', 'A'],
  ['What year did the Berlin Wall fall?', '1989', '1979', 'A'],
  ['Which pharaohs tomb was found by Howard Carter?', 'TUTANKHAMUN', 'RAMSES II', 'A'],
  ['Who led the first expedition around the world?', 'MAGELLAN', 'COOK', 'A'],
  ['Which city was the capital of the Byzantine Empire?', 'CONSTANTINOPLE', 'CARTAGE', 'A'],
  ['What was the ancient Greek marketplace called?', 'AGORA', 'FORUM', 'A'],
  ['Which dynasty built much of the Great Wall?', 'MING', 'TUDOR', 'A'],
  ['Who was the first woman to win a Nobel Prize?', 'MARIE CURIE', 'ADA LOVELACE', 'A'],
  ['Which revolution began in France in 1789?', 'FRENCH REVOLUTION', 'INDUSTRIAL REVOLUTION', 'A'],
  ['What was the name of the Roman peace period?', 'PAX ROMANA', 'PAX BRITANNICA', 'A'],
  ['Which civilization used quipu records?', 'INCA', 'ROMAN', 'A'],
  ['Who was the first emperor of Rome?', 'AUGUSTUS', 'NERO', 'A'],
  ['Which treaty created the European Union predecessor?', 'TREATY OF ROME', 'TREATY OF PARIS', 'A'],
  ['What was the capital of the Aztec Empire?', 'TENOCHTITLAN', 'TEOTIHUACAN', 'A'],
  ['Which leader is associated with nonviolent independence in India?', 'MAHATMA GANDHI', 'SUN YAT-SEN', 'A'],
  ['What was the name of the first successful English colony in America?', 'JAMESTOWN', 'PLYMOUTH', 'A'],
  ['Which civilization built Chichen Itza?', 'MAYA', 'PERSIAN', 'A'],
  ['Who was the first person in space?', 'YURI GAGARIN', 'NEIL ARMSTRONG', 'A'],
  ['Which age followed the Stone Age?', 'BRONZE AGE', 'SPACE AGE', 'A'],
  ['What was the ancient Roman public bath called?', 'THERMAE', 'BAZAAR', 'A']
])

add('TECHNOLOGY', 'EASY', [
  ['What does a keyboard type?', 'TEXT', 'WATER', 'A'],
  ['Which device displays computer images?', 'MONITOR', 'ROUTER', 'A'],
  ['What does Wi-Fi provide?', 'WIRELESS NETWORKING', 'PAPER PRINTING', 'A'],
  ['Which key starts a new line?', 'ENTER', 'SHIFT', 'A'],
  ['What stores files permanently in a computer?', 'DRIVE', 'MOUSE', 'A'],
  ['Which device moves a cursor?', 'MOUSE', 'MODEM', 'A'],
  ['What does a camera capture?', 'IMAGES', 'PASSWORDS', 'A'],
  ['Which technology uses satellites for location?', 'GPS', 'USB', 'A'],
  ['What is a smartphone used for?', 'COMMUNICATION', 'COOKING', 'A'],
  ['Which symbol begins an email address?', '@', '#', 'A'],
  ['What does USB commonly connect?', 'DEVICES', 'CLOUDS', 'A'],
  ['Which device prints documents?', 'PRINTER', 'SCANNER', 'A'],
  ['What does a battery store?', 'ENERGY', 'WATER', 'A'],
  ['Which screen technology uses touch input?', 'TOUCHSCREEN', 'KEYBOARD', 'A'],
  ['What does a browser open?', 'WEB PAGES', 'CLOTHES', 'A'],
  ['Which device records sound?', 'MICROPHONE', 'PROJECTOR', 'A'],
  ['What does a QR code store?', 'ENCODED DATA', 'HEAT', 'A'],
  ['Which technology makes copies of objects layer by layer?', '3D PRINTING', 'RADIO', 'A'],
  ['What does an operating system manage?', 'COMPUTER RESOURCES', 'WEATHER', 'A'],
  ['Which connection is commonly wireless?', 'BLUETOOTH', 'HDMI', 'A']
])

add('TECHNOLOGY', 'MEDIUM', [
  ['What does CPU stand for?', 'CENTRAL PROCESSING UNIT', 'COMPUTER POWER USER', 'A'],
  ['Which protocol secures web traffic?', 'HTTPS', 'HTTPX', 'A'],
  ['What is cloud computing?', 'REMOTE COMPUTING SERVICES', 'RAIN FORECASTING', 'A'],
  ['Which language structures web pages?', 'HTML', 'MP3', 'A'],
  ['What does CSS control?', 'PAGE STYLE', 'DATABASE KEYS', 'A'],
  ['Which format is commonly used for photographs?', 'JPEG', 'TXT', 'A'],
  ['What is two-factor authentication for?', 'ACCOUNT SECURITY', 'FASTER PRINTING', 'A'],
  ['Which storage is solid state?', 'SSD', 'CRT', 'A'],
  ['What does an algorithm provide?', 'A STEP-BY-STEP METHOD', 'A POWER SOURCE', 'A'],
  ['Which network device forwards packets?', 'ROUTER', 'MONITOR', 'A'],
  ['What is an open-source project?', 'CODE WITH SHARED SOURCE', 'A CLOSED SECRET', 'A'],
  ['Which file format is a portable document?', 'PDF', 'PNG', 'A'],
  ['What does encryption protect?', 'INFORMATION', 'SCREEN BRIGHTNESS', 'A'],
  ['Which unit measures digital storage?', 'BYTE', 'METER', 'A'],
  ['What is machine learning trained on?', 'DATA', 'SAND', 'A'],
  ['Which database operation retrieves records?', 'QUERY', 'PAINT', 'A'],
  ['What does an API provide?', 'SOFTWARE ACCESS RULES', 'AUDIO VOLUME', 'A'],
  ['Which version-control tool tracks commits?', 'GIT', 'GRIP', 'A'],
  ['What does a firewall help control?', 'NETWORK TRAFFIC', 'ROOM LIGHTS', 'A'],
  ['Which protocol transfers web pages?', 'HTTP', 'SMTP', 'A']
])

add('SPACE', 'EASY', [
  ['Which star is closest to Earth?', 'THE SUN', 'SIRIUS', 'A'],
  ['How many planets orbit the Sun?', 'EIGHT', 'NINE', 'A'],
  ['Which planet has famous rings?', 'SATURN', 'MARS', 'A'],
  ['What is Earths natural satellite?', 'THE MOON', 'PHOBOS', 'A'],
  ['Which planet is largest?', 'JUPITER', 'NEPTUNE', 'A'],
  ['What do astronauts wear in space?', 'SPACESUITS', 'RAINCOATS', 'A'],
  ['Which planet is closest to the Sun?', 'MERCURY', 'VENUS', 'A'],
  ['What is the path of an object around a planet?', 'ORBIT', 'AXIS', 'A'],
  ['What force keeps planets in orbit?', 'GRAVITY', 'FRICTION', 'A'],
  ['Which galaxy contains our solar system?', 'MILKY WAY', 'ANDROMEDA', 'A'],
  ['What is a space rock that reaches Earth?', 'METEORITE', 'COMET TAIL', 'A'],
  ['Which planet is called the Blue Planet?', 'EARTH', 'URANUS', 'A'],
  ['What is a rocket used for?', 'SPACE TRAVEL', 'OCEAN FISHING', 'A'],
  ['Which object produces its own light?', 'STAR', 'MOON', 'A'],
  ['What is the red surface dust on Mars called?', 'REGOLITH', 'TUNDRA', 'A'],
  ['Which planet is famous for its Great Red Spot?', 'JUPITER', 'SATURN', 'A'],
  ['What is a group of stars forming a pattern?', 'CONSTELLATION', 'CONTINENT', 'A'],
  ['Which object has a bright tail near the Sun?', 'COMET', 'ASTEROID', 'A'],
  ['What is the boundary around a black hole called?', 'EVENT HORIZON', 'OZONE RING', 'A'],
  ['Which planet rotates on its side?', 'URANUS', 'EARTH', 'A']
])

add('SPACE', 'MEDIUM', [
  ['What is the study of space called?', 'ASTRONOMY', 'BOTANY', 'A'],
  ['Which planet has the fastest winds?', 'NEPTUNE', 'MERCURY', 'A'],
  ['What powers the Sun?', 'NUCLEAR FUSION', 'BURNING COAL', 'A'],
  ['What is a light-year a measure of?', 'DISTANCE', 'TIME ON EARTH', 'A'],
  ['Which telescope launched in 2021?', 'JAMES WEBB', 'HUBBLE II', 'A'],
  ['What type of galaxy is the Milky Way?', 'SPIRAL', 'CUBIC', 'A'],
  ['Which planet has Olympus Mons?', 'MARS', 'VENUS', 'A'],
  ['What is the asteroid belt between?', 'MARS AND JUPITER', 'EARTH AND MARS', 'A'],
  ['What does a lunar eclipse involve?', 'EARTHS SHADOW ON MOON', 'MOONS SHADOW ON SUN', 'A'],
  ['Which dwarf planet lies in the Kuiper belt?', 'PLUTO', 'CERES', 'A'],
  ['What is a neutron star made from?', 'DENSE STELLAR MATTER', 'FROZEN WATER', 'A'],
  ['Which mission first landed humans on the Moon?', 'APOLLO 11', 'GEMINI 4', 'A'],
  ['What is the apparent brightness of a star called?', 'MAGNITUDE', 'LATITUDE', 'A'],
  ['Which planet has a day longer than its year?', 'VENUS', 'EARTH', 'A'],
  ['What is the boundary where solar wind slows?', 'HELIOPAUSE', 'EQUATOR', 'A'],
  ['Which moon is known for its methane lakes?', 'TITAN', 'EUROPA', 'A'],
  ['What is a planet outside our solar system?', 'EXOPLANET', 'ASTEROID', 'A'],
  ['Which force creates tides most strongly?', 'MOONS GRAVITY', 'SUNLIGHT', 'A'],
  ['What is a supernova?', 'A STELLAR EXPLOSION', 'A PLANETARY OCEAN', 'A'],
  ['Which planet has the tallest volcano?', 'MARS', 'JUPITER', 'A']
])

add('CULTURE', 'EASY', [
  ['Who wrote Romeo and Juliet?', 'SHAKESPEARE', 'DICKENS', 'A'],
  ['Which instrument has black and white keys?', 'PIANO', 'DRUM', 'A'],
  ['What color is made by mixing red and blue?', 'PURPLE', 'GREEN', 'A'],
  ['Which art uses a camera?', 'PHOTOGRAPHY', 'SCULPTURE', 'A'],
  ['What is a story with a moral called?', 'FABLE', 'ATLAS', 'A'],
  ['Which dance originated in Argentina?', 'TANGO', 'WALTZ', 'A'],
  ['What do actors perform in?', 'PLAYS', 'MAPS', 'A'],
  ['Which material is used to make pottery?', 'CLAY', 'WOOL', 'A'],
  ['What is a group of musicians called?', 'BAND', 'FLOCK', 'A'],
  ['Which shape has three sides?', 'TRIANGLE', 'CIRCLE', 'A'],
  ['What is the opposite of silent in music?', 'LOUD', 'ROUND', 'A'],
  ['Which instrument is played with a bow?', 'VIOLIN', 'TRUMPET', 'A'],
  ['What is a book of maps called?', 'ATLAS', 'ALBUM', 'A'],
  ['Which art form uses movement to music?', 'DANCE', 'POTTERY', 'A'],
  ['What is a painting made on wet plaster called?', 'FRESCO', 'MURAL SONG', 'A'],
  ['Which festival is known for colorful powder in India?', 'HOLI', 'DIWALI', 'A'],
  ['What is the main language of Brazil?', 'PORTUGUESE', 'SPANISH', 'A'],
  ['Which instrument has strings and a bow?', 'CELLO', 'FLUTE', 'A'],
  ['What is a short humorous poem?', 'LIMERICK', 'EPIC', 'A'],
  ['Which medium uses ink and a pen?', 'DRAWING', 'CARVING', 'A']
])

add('CULTURE', 'MEDIUM', [
  ['Who composed The Four Seasons?', 'VIVALDI', 'MOZART', 'A'],
  ['What is a Japanese folded-paper art?', 'ORIGAMI', 'KABUKI', 'A'],
  ['Which architecture has pointed Gothic arches?', 'GOTHIC', 'BAROQUE', 'A'],
  ['What is a novel told through letters?', 'EPISTOLARY', 'LYRIC', 'A'],
  ['Which museum is home to the Mona Lisa?', 'THE LOUVRE', 'THE UFFIZI', 'A'],
  ['What is a repeated musical pattern called?', 'OSTINATO', 'SONNET', 'A'],
  ['Which literary genre imagines future technology?', 'SCIENCE FICTION', 'REALISM', 'A'],
  ['What is a sculpture made by cutting stone?', 'CARVING', 'WEAVING', 'A'],
  ['Which theatre tradition uses masks in Japan?', 'NOH', 'SAMBA', 'A'],
  ['What is the study of language called?', 'LINGUISTICS', 'BOTANY', 'A'],
  ['Which painting style uses small dots of color?', 'POINTILLISM', 'CUBISM', 'A'],
  ['What is a three-line Japanese poem?', 'HAIKU', 'ODE', 'A'],
  ['Which dance is associated with Spain?', 'FLAMENCO', 'HULA', 'A'],
  ['What is the repeated main idea of an artwork?', 'THEME', 'RHYME', 'A'],
  ['Which instrument family includes the trumpet?', 'BRASS', 'STRING', 'A'],
  ['What is a building for performances called?', 'THEATRE', 'ARCHIVE', 'A'],
  ['Which color model mixes light?', 'RGB', 'CMYK ONLY', 'A'],
  ['What is a poem of fourteen lines called?', 'SONNET', 'BALLAD', 'A'],
  ['Which art movement used dream imagery?', 'SURREALISM', 'REALISM', 'A'],
  ['What is a traditional West African drum called?', 'DJEMBE', 'SITAR', 'A']
])

add('EVERYDAY', 'EASY', [
  ['How many minutes are in one hour?', 'SIXTY', 'THIRTY', 'A'],
  ['How many sides does a triangle have?', 'THREE', 'FOUR', 'A'],
  ['Which meal is usually eaten in the morning?', 'BREAKFAST', 'DINNER', 'A'],
  ['What tool is used to cut paper?', 'SCISSORS', 'SPOON', 'A'],
  ['Which shape has four equal sides?', 'SQUARE', 'OVAL', 'A'],
  ['How many days are in a week?', 'SEVEN', 'TEN', 'A'],
  ['What do you use to tell time?', 'CLOCK', 'COMPASS', 'A'],
  ['Which liquid do humans commonly drink?', 'WATER', 'INK', 'A'],
  ['What is used to unlock a door?', 'KEY', 'PLATE', 'A'],
  ['Which season follows spring?', 'SUMMER', 'WINTER', 'A'],
  ['How many hours are in a day?', 'TWENTY-FOUR', 'TWELVE', 'A'],
  ['Which item keeps rain off your head?', 'UMBRELLA', 'TOWEL', 'A'],
  ['What appliance keeps food cold?', 'REFRIGERATOR', 'TOASTER', 'A'],
  ['Which direction does the Sun rise from?', 'EAST', 'WEST', 'A'],
  ['What do you use to write on a chalkboard?', 'CHALK', 'SOAP', 'A'],
  ['How many months are in a year?', 'TWELVE', 'TEN', 'A'],
  ['Which object shows your reflection?', 'MIRROR', 'PILLOW', 'A'],
  ['What is used to sweep a floor?', 'BROOM', 'FORK', 'A'],
  ['Which item is worn on your feet?', 'SHOES', 'GLOVES', 'A'],
  ['What does a thermometer measure?', 'TEMPERATURE', 'DISTANCE', 'A']
])

add('EVERYDAY', 'MEDIUM', [
  ['What is 12 times 12?', '144', '124', 'A'],
  ['How many degrees are in a right angle?', '90', '45', 'A'],
  ['What is the perimeter of a square with side 3?', '12', '9', 'A'],
  ['Which fraction equals one half?', '2/4', '3/4', 'A'],
  ['What is the next prime after 7?', '11', '9', 'A'],
  ['How many meters are in a kilometer?', '1000', '100', 'A'],
  ['What is 15 percent of 100?', '15', '10', 'A'],
  ['Which number is even?', '28', '27', 'A'],
  ['What is the boiling point of water in Celsius?', '100', '80', 'A'],
  ['How many grams are in a kilogram?', '1000', '100', 'A'],
  ['What is the median of 2, 4, 6?', '4', '6', 'A'],
  ['Which unit measures electrical power?', 'WATT', 'LITER', 'A'],
  ['What is 9 squared?', '81', '18', 'A'],
  ['How many centimeters are in a meter?', '100', '10', 'A'],
  ['What is the area of a 2 by 3 rectangle?', '6', '5', 'A'],
  ['Which number is a multiple of 5?', '35', '32', 'A'],
  ['What is the Roman numeral for ten?', 'X', 'V', 'A'],
  ['How many sides does a hexagon have?', 'SIX', 'EIGHT', 'A'],
  ['What is 100 divided by 4?', '25', '40', 'A'],
  ['Which angle is greater than a right angle?', 'OBTUSE', 'ACUTE', 'A']
])

add('SPORTS', 'EASY', [
  ['How many players are on a soccer team on the field?', 'ELEVEN', 'SIX', 'A'],
  ['Which sport uses a racket and shuttlecock?', 'BADMINTON', 'CRICKET', 'A'],
  ['What color flag signals the end of a motor race?', 'CHEQUERED', 'PURPLE', 'A'],
  ['Which sport is played at Wimbledon?', 'TENNIS', 'RUGBY', 'A'],
  ['How many rings are on the Olympic flag?', 'FIVE', 'FOUR', 'A'],
  ['Which sport uses a bat and bases?', 'BASEBALL', 'HOCKEY', 'A'],
  ['What is a score of zero in tennis called?', 'LOVE', 'NILBY', 'A'],
  ['Which sport has a scrum?', 'RUGBY', 'GOLF', 'A'],
  ['What is the object hit in table tennis?', 'BALL', 'PUCK', 'A'],
  ['Which sport is played on ice with a puck?', 'ICE HOCKEY', 'LACROSSE', 'A'],
  ['How many points is a basketball free throw worth?', 'ONE', 'TWO', 'A'],
  ['Which sport has a goalkeeper and goals?', 'SOCCER', 'GOLF', 'A'],
  ['What is a marathon distance approximately?', '42 KM', '10 KM', 'A'],
  ['Which sport uses clubs and holes?', 'GOLF', 'POLO', 'A'],
  ['What is the top prize in many tennis tournaments called?', 'TROPHY', 'CAP', 'A'],
  ['Which sport includes a pommel horse?', 'GYMNASTICS', 'CYCLING', 'A'],
  ['What is a boxing ring shaped like?', 'SQUARE', 'TRIANGLE', 'A'],
  ['Which sport uses a net and a volleyball?', 'VOLLEYBALL', 'HANDBALL', 'A'],
  ['What is the start of a swimming race called?', 'DIVE', 'KICKOFF', 'A'],
  ['Which sport is associated with a caddie?', 'GOLF', 'TENNIS', 'A']
])

add('SPORTS', 'MEDIUM', [
  ['How many points is a touchdown worth before the extra point?', 'SIX', 'SEVEN', 'A'],
  ['Which country hosted the first modern Olympics?', 'GREECE', 'FRANCE', 'A'],
  ['What is a hat-trick in sport?', 'THREE SCORES', 'TWO FOULS', 'A'],
  ['Which sport has a Tour de France?', 'CYCLING', 'RUNNING', 'A'],
  ['What is the term for three strikes in baseball?', 'STRIKEOUT', 'TRIPLE PLAY', 'A'],
  ['Which sport has a Grand Slam tournament?', 'TENNIS', 'ROWING', 'A'],
  ['What is the highest score in a single dart throw?', '60', '100', 'A'],
  ['Which sport uses a foil?', 'FENCING', 'DIVING', 'A'],
  ['What is an eagle in golf?', 'TWO UNDER PAR', 'ONE OVER PAR', 'A'],
  ['Which sport has a libero position?', 'VOLLEYBALL', 'CRICKET', 'A'],
  ['What is the halfway point in a football match?', 'HALF-TIME', 'SET POINT', 'A'],
  ['Which sport uses wickets?', 'CRICKET', 'BASEBALL', 'A'],
  ['What is a decathlon made of?', 'TEN EVENTS', 'FIVE EVENTS', 'A'],
  ['Which sport includes a balance beam?', 'GYMNASTICS', 'FENCING', 'A'],
  ['What is a clean and jerk?', 'WEIGHTLIFTING MOVE', 'SWIMMING TURN', 'A'],
  ['Which sport has a scrum-half?', 'RUGBY', 'BASKETBALL', 'A'],
  ['What does VAR assist in?', 'FOOTBALL REFEREEING', 'GOLF PUTTING', 'A'],
  ['Which sport awards a yellow jersey in France?', 'CYCLING', 'SKIING', 'A'],
  ['What is a perfect score in ten-pin bowling?', '300', '100', 'A'],
  ['Which sport is played in a velodrome?', 'TRACK CYCLING', 'SURFING', 'A']
])

function buildBank(): BankQuestion[] {
  return seeds.map((entry, index) => ({
    questionId: 'q-' + String(index + 1).padStart(3, '0'),
    questionText: entry.questionText,
    answerA: entry.answerA,
    answerB: entry.answerB,
    correctSide: entry.correctSide,
    category: entry.category,
    difficulty: entry.difficulty,
    bankVersion: BANK_VERSION
  }))
}

export const QUESTION_BANK_VERSION = BANK_VERSION
export const QUESTION_BANK: BankQuestion[] = buildBank()

export function validateQuestionBank(bank: BankQuestion[] = QUESTION_BANK): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const texts = new Set<string>()
  const validCategories = new Set<QuestionCategory>(['GENERAL', 'SCIENCE', 'TECHNOLOGY', 'NATURE', 'GEOGRAPHY', 'HISTORY', 'CULTURE', 'SPACE', 'EVERYDAY', 'SPORTS'])
  for (const question of bank) {
    if (ids.has(question.questionId)) errors.push('duplicate id: ' + question.questionId)
    ids.add(question.questionId)
    const normalizedText = question.questionText.trim().toLowerCase()
    if (!normalizedText) errors.push('empty question: ' + question.questionId)
    if (texts.has(normalizedText)) errors.push('duplicate question text: ' + question.questionId)
    texts.add(normalizedText)
    if (!question.answerA.trim() || !question.answerB.trim()) errors.push('empty answer: ' + question.questionId)
    if (question.answerA.trim().toLowerCase() === question.answerB.trim().toLowerCase()) errors.push('identical answers: ' + question.questionId)
    if (question.correctSide !== 'A' && question.correctSide !== 'B') errors.push('invalid correct side: ' + question.questionId)
    if (!validCategories.has(question.category)) errors.push('invalid category: ' + question.questionId)
    if (question.questionText.length > 100 || question.answerA.length > 28 || question.answerB.length > 28) errors.push('mobile length: ' + question.questionId)
  }
  if (bank.length < 200) errors.push('question bank below launch minimum: ' + bank.length)
  return errors
}

const bankErrors = validateQuestionBank()
if (bankErrors.length) throw new Error('Invalid SHADOW PARK question bank: ' + bankErrors.join('; '))
