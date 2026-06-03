import type { Sticker, TeamInfo } from '@/lib/types'

function makeTeam(code: string, name: string, players: string[]): Sticker[] {
  const stickers: Sticker[] = []
  stickers.push({ code: `${code}1`, name: 'Team Logo', team: name, teamCode: code, type: 'logo', isFoil: true, position: 1 })
  for (let i = 0; i < 11; i++) {
    stickers.push({ code: `${code}${i + 2}`, name: players[i], team: name, teamCode: code, type: 'player', isFoil: false, position: i + 2 })
  }
  stickers.push({ code: `${code}13`, name: 'Team Photo', team: name, teamCode: code, type: 'photo', isFoil: false, position: 13 })
  for (let i = 11; i < 18; i++) {
    stickers.push({ code: `${code}${i + 3}`, name: players[i], team: name, teamCode: code, type: 'player', isFoil: false, position: i + 3 })
  }
  return stickers
}

const INTRO_STICKERS: Sticker[] = [
  { code: '00', name: 'Panini Logo', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 0 },
  { code: 'FWC1', name: 'Official Emblem', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 1 },
  { code: 'FWC2', name: 'Official Emblem', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 2 },
  { code: 'FWC3', name: 'Official Mascots', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 3 },
  { code: 'FWC4', name: 'Official Slogan', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 4 },
  { code: 'FWC5', name: 'Official Ball', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 5 },
  { code: 'FWC6', name: 'Canada – Host Cities', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 6 },
  { code: 'FWC7', name: 'Mexico – Host Cities', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 7 },
  { code: 'FWC8', name: 'USA – Host Cities', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 8 },
  { code: 'FWC9', name: 'Italy 1934', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 9 },
  { code: 'FWC10', name: 'Uruguay 1950', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 10 },
  { code: 'FWC11', name: 'West Germany 1954', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 11 },
  { code: 'FWC12', name: 'Brazil 1962', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 12 },
  { code: 'FWC13', name: 'West Germany 1974', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 13 },
  { code: 'FWC14', name: 'Argentina 1986', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 14 },
  { code: 'FWC15', name: 'Brazil 1994', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 15 },
  { code: 'FWC16', name: 'Brazil 2002', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 16 },
  { code: 'FWC17', name: 'Italy 2006', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 17 },
  { code: 'FWC18', name: 'Germany 2014', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 18 },
  { code: 'FWC19', name: 'Argentina 2022', team: 'Introduction', teamCode: 'FWC', type: 'intro', isFoil: true, position: 19 },
]

const BONUS_TEAM: TeamInfo = { code: 'CC', name: 'Coca Cola' }

export const BONUS_STICKERS: Sticker[] = [
  { code: 'CC1', name: 'Coca Cola 1', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 1 },
  { code: 'CC2', name: 'Coca Cola 2', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 2 },
  { code: 'CC3', name: 'Coca Cola 3', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 3 },
  { code: 'CC4', name: 'Coca Cola 4', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 4 },
  { code: 'CC5', name: 'Coca Cola 5', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 5 },
  { code: 'CC6', name: 'Coca Cola 6', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 6 },
  { code: 'CC7', name: 'Coca Cola 7', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 7 },
  { code: 'CC8', name: 'Coca Cola 8', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 8 },
  { code: 'CC9', name: 'Coca Cola 9', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 9 },
  { code: 'CC10', name: 'Coca Cola 10', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 10 },
  { code: 'CC11', name: 'Coca Cola 11', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 11 },
  { code: 'CC12', name: 'Coca Cola 12', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 12 },
  { code: 'CC13', name: 'Coca Cola 13', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 13 },
  { code: 'CC14', name: 'Coca Cola 14', team: BONUS_TEAM.name, teamCode: BONUS_TEAM.code, type: 'intro', isFoil: false, position: 14 },
]

const TEAM_DATA: Array<{ code: string; name: string; players: string[] }> = [
  { code: 'ALG', name: 'Algeria', players: ['Alexis Guendouz', 'Ramy Bensebaini', 'Youcef Atal', 'Rayan Aït-Nouri', 'Mohamed Amine Tougai', 'Aïssa Mandi', 'Ismael Bennacer', 'Houssem Aquar', 'Hicham Boudaoui', 'Ramiz Zerrouki', 'Nabil Bentalab', 'Farés Chaibi', 'Riyad Mahrez', 'Said Benrahma', 'Anis Hadj Moussa', 'Amine Gouiri', 'Baghdad Bounedjah', 'Mohammed Amoura'] },
  { code: 'ARG', name: 'Argentina', players: ['Emiliano Martinez', 'Nahuel Molina', 'Cristian Romero', 'Nicolas Otamendi', 'Nicolas Tagliafico', 'Leonardo Balerdi', 'Enzo Fernandez', 'Alexis Mac Allister', 'Rodrigo De Paul', 'Exequiel Palacios', 'Leandro Paredes', 'Nico Paz', 'Franco Mastantuono', 'Nico Gonzalez', 'Lionel Messi', 'Lautaro Martinez', 'Julian Alvarez', 'Giuliano Simeone'] },
  { code: 'AUS', name: 'Australia', players: ['Mathew Ryan', 'Joe Gauci', 'Harry Souttar', 'Alessandro Circati', 'Jordan Bos', 'Aziz Behich', 'Cameron Burgess', 'Lewis Miller', 'Milos Degenek', 'Jackson Irvine', 'Riley McGree', 'Aiden O\'Neill', 'Connor Metcalfe', 'Patrick Yazbek', 'Craig Goodwin', 'Kusini Vengi', 'Nestory Irankunda', 'Mohamed Touré'] },
  { code: 'AUT', name: 'Austria', players: ['Alexander Schlager', 'Patrick Pentz', 'David Alaba', 'Kevin Danso', 'Philipp Lienhart', 'Stefan Posch', 'Phillipp Mwene', 'Alexander Prass', 'Xaver Schlager', 'Marcel Sabitzer', 'Konrad Laimer', 'Florian Grillitsch', 'Nicolas Seiwald', 'Romano Schmid', 'Patrick Wimmer', 'Christoph Baumgartner', 'Michael Gregoritsch', 'Marko Arnautović'] },
  { code: 'BEL', name: 'Belgium', players: ['Thibaut Courtois', 'Arthur Theate', 'Timothy Castagne', 'Zeno Debast', 'Brandon Mechele', 'Maxim De Cuyper', 'Thomas Meunier', 'Youri Tielemans', 'Amadou Onana', 'Nicolas Raskin', 'Alexis Saelemaekers', 'Hans Vanaken', 'Kevin De Bruyne', 'Jérémy Doku', 'Charles De Ketelaere', 'Leandro Trossard', 'Loïs Openda', 'Romelu Lukaku'] },
  { code: 'BIH', name: 'Bosnia and Herzegovina', players: ['Nikola Vasilj', 'Amer Dedic', 'Sead Kolasinac', 'Tarik Muharemovic', 'Nihad Mujakic', 'Nikola Katic', 'Amir Hadziahmetovic', 'Benjamin Tahirovic', 'Armin Gigovic', 'Ivan Sunjic', 'Ivan Basic', 'Dzenis Burnic', 'Esmir Bajraktarevic', 'Amar Memic', 'Ermedin Demirovic', 'Edin Dzeko', 'Samed Bazdar', 'Haris Tabakovic'] },
  { code: 'BRA', name: 'Brazil', players: ['Alisson', 'Bento', 'Marquinhos', 'Éder Militão', 'Gabriel Magalhães', 'Danilo', 'Wesley', 'Lucas Paquetá', 'Casemiro', 'Bruno Guimarães', 'Luiz Henrique', 'Vinicius Júnior', 'Rodrygo', 'João Pedro', 'Matheus Cunha', 'Gabriel Martinelli', 'Raphinha', 'Estévão'] },
  { code: 'CAN', name: 'Canada', players: ['Dayne St.Clair', 'Alphonso Davies', 'Alistair Johnston', 'Samuel Adekugbe', 'Riche Larvea', 'Derek Cornelius', 'Moïse Bombito', 'Kamal Miller', 'Stephen Eustáquio', 'Ismaël Koné', 'Jonathan Osorio', 'Jacob Shaffelburg', 'Mathieu Choinière', 'Niko Sigur', 'Tajon Buchanan', 'Liam Millar', 'Cyle Larin', 'Jonathan David'] },
  { code: 'CPV', name: 'Cape Verde', players: ['Vozinha', 'Logan Costa', 'Pico', 'Diney', 'Steven Moreira', 'Wagner Pina', 'Joao Paulo', 'Yannick Semedo', 'Kevin Pina', 'Patrick Andrade', 'Jamiro Monteiro', 'Deroy Duarte', 'Garry Rodrigues', 'Jovane Cabral', 'Ryan Mendes', 'Dailon Livramento', 'Willy Semedo', 'Bebe'] },
  { code: 'COL', name: 'Colombia', players: ['Camilo Vargas', 'David Ospina', 'Dávinson Sánchez', 'Yerry Mina', 'Daniel Munoz', 'Johan Mojica', 'Jhon Lucumí', 'Santiago Arias', 'Jefferson Lerma', 'Kevin Castaño', 'Richard Rios', 'James Rodriguez', 'Juan Fernando Quintero', 'Jorge Carrascal', 'Jon Arias', 'Jhon Cordova', 'Luis Suarez', 'Luis Diaz'] },
  { code: 'COD', name: 'Congo DR', players: ['Lionel Mpasi', 'Aaron Wan-Bissaka', 'Axel Tuanzebe', 'Arthur Masuaku', 'Chancel Mbemba', 'Joris Kayembe', 'Charles Pickel', "Ngal'ayel Mukau", 'Edo Kayembe', 'Samuel Moutoussamy', 'Noah Sadiki', 'Théo Bongonda', 'Meschak Elia', 'Yoane Wissa', 'Brian Cipenga', 'Fiston Mayele', 'Cédric Bakambu', 'Nathanaël Mbuku'] },
  { code: 'CRO', name: 'Croatia', players: ['Dominik Livaković', 'Duje Caleta-Car', 'Josko Gvardiol', 'Josip Stanišić', 'Luka Vušković', 'Josip Sutalo', 'Kristijan Jakic', 'Luka Modrić', 'Mateo Kovacic', 'Martin Baturina', 'Lovro Majer', 'Mario Pasalic', 'Petar Sucic', 'Ivan Perišić', 'Marco Pasalic', 'Ante Budimir', 'Andrej Kramarić', 'Franjo Ivanovic'] },
  { code: 'CUW', name: 'Curaçao', players: ['Eloy Room', 'Armando Obispo', 'Sherel Floranus', 'Jurien Gaari', 'Joshua Brenet', 'Roshon Van Eijma', 'Shurandy Sambo', 'Livano Comenencia', 'Godfried Roemeratoe', 'Juninho Bacuna', 'Leandro Bacuna', 'Tahith Chong', 'Kenji Gorre', 'Jearl Margaritha', 'Jurgen Locadia', 'Jeremy Antonisse', 'Gervane Kastaneer', 'Sontje Hansen'] },
  { code: 'CZE', name: 'Czechia', players: ['Matej Kovar', 'Jindreich Stanek', 'Ladislav Krejci', 'Vladimir Coufal', 'Jaroslav Zeleny', 'Tomas Holes', 'David Zima', 'Michal Sadilek', 'Lukas Provod', 'Lukas Cerv', 'Tomas Soucek', 'Pavel Sulc', 'Matej Vydra', 'Vasil Kusej', 'Tomas Chory', 'Vaclav Cerny', 'Adam Hlozek', 'Patrik Schick'] },
  { code: 'ECU', name: 'Ecuador', players: ['Hernán Galíndez', 'Gonzalo Valle', 'Piero Hincapié', 'Pervis Estupiñán', 'Willian Pacho', 'Ángelo Preciado', 'Joel Ordóñez', 'Moises Caicedo', 'Alan Franco', 'Kendry Paez', 'Pedro Vite', 'John Veboah', 'Leonardo Campana', 'Gonzalo Plata', 'Nilson Angulo', 'Alan Minda', 'Kevin Rodriguez', 'Enner Valencia'] },
  { code: 'EGY', name: 'Egypt', players: ['Mohamed El Shenawy', 'Mohamed Hany', 'Mohamed Hamdy', 'Yasser Ibrahim', 'Khaled Sobhi', 'Ramy Rabia', 'Hossam Abdelmaguid', 'Ahmed Fatouh', 'Marwan Attia', 'Zizo', 'Hamdy Fathy', 'Mohamed Lasheen', 'Emam Ashour', 'Osama Faisal', 'Mohamed Salah', 'Mostafa Mohamed', 'Trezeguet', 'Omar Marmoush'] },
  { code: 'ENG', name: 'England', players: ['Jordan Pickford', 'John Stones', 'Marc Guéhi', 'Ezri Konsa', 'Trent Alexander-Arnold', 'Reece James', 'Dan Burn', 'Jordan Henderson', 'Declan Rice', 'Jude Bellingham', 'Cole Palmer', 'Morgan Rogers', 'Anthony Gordon', 'Phil Foden', 'Bukayo Saka', 'Harry Kane', 'Marcus Rashford', 'Ollie Watkins'] },
  { code: 'FRA', name: 'France', players: ['Mike Maignan', 'Theo Hernandez', 'William Saliba', 'Jules Kounde', 'Ibrahima Konate', 'Dayot Upamecano', 'Lucas Digne', 'Aurélien Tchouaméni', 'Eduardo Camavinga', 'Manu Kone', 'Adrien Rabiot', 'Michael Olise', 'Ousmane Dembele', 'Bradley Barcola', 'Désiré Doué', 'Kingsley Coman', 'Hugo Ekitike', 'Kylian Mbappe'] },
  { code: 'GER', name: 'Germany', players: ['Marc-André ter Stegen', 'Jonathan Tah', 'David Raum', 'Nico Schlotterbeck', 'Antonio Rüdiger', 'Waldemar Anton', 'Ridle Baku', 'Maximilian Mittelstadt', 'Joshua Kimmich', 'Florian Wirtz', 'Felix Nmecha', 'Leon Goretzka', 'Jamal Musiala', 'Serge Gnabry', 'Kai Havertz', 'Leroy Sane', 'Karim Adeyemi', 'Nick Woltemade'] },
  { code: 'GHA', name: 'Ghana', players: ['Lawrence Ati Zigi', 'Tariq Lamptey', 'Mohammed Salisu', 'Alidu Seidu', 'Alexander Djiku', 'Gideon Mensah', 'Caleb Yirenkyi', 'Abdul Issahaku Fatawu', 'Thomas Partey', 'Salis Abdul Samed', 'Kamaldeen Sulemana', 'Mohammed Kudus', 'Inaki Williams', 'Jordan Ayew', 'Andrew Ayew', 'Joseph Paintsil', 'Osman Bukari', 'Antoine Semenyo'] },
  { code: 'HAI', name: 'Haiti', players: ['Johny Placide', 'Carlens Arcus', 'Martin Expérience', 'Jean-Kevin Duverne', 'Ricardo Adé', 'Duke Lacroix', 'Garven Metusala', 'Hannes Delcroix', 'Leverton Pierre', 'Danley Jean Jacques', 'Jean-Ricner Bellegarde', 'Christopher Attys', 'Derrick Etienne Jr', 'Josue Casimir', 'Ruben Providence', 'Duckens Nazon', 'Louicius Deedson', 'Frantzdy Pierrot'] },
  { code: 'IRN', name: 'Iran', players: ['Alireza Beiranvand', 'Morteza Pouraliganji', 'Ehsan Hajsafi', 'Milad Mohammadi', 'Shojae Khalilzadeh', 'Ramin Rezaeian', 'Hossein Kanaani', 'Sadegh Moharrami', 'Saleh Hardani', 'Saeed Ezatolahi', 'Saman Ghoddos', 'Omid Noorafkan', 'Roozbeh Cheshmi', 'Mohammad Mohebi', 'Sardar Azmoun', 'Mehdi Taremi', 'Alireza Jahanbakhsh', 'Ali Gholizadeh'] },
  { code: 'IRQ', name: 'Iraq', players: ['Jalal Hassan', 'Rebin Sulaka', 'Hussein Ali', 'Akam Hashem', 'Merchas Doski', 'Zaid Tahseen', 'Manaf Younis', 'Zidane Iqbal', 'Amir Al-Ammari', 'Ibrahim Bavesh', 'Ali Jasim', 'Youssef Amyn', 'Aimar Sher', 'Marko Farji', 'Osama Rashid', 'Ali Al-Hamadi', 'Aymen Hussein', 'Mohanad Ali'] },
  { code: 'CIV', name: 'Ivory Coast', players: ['Yahia Fofana', 'Ghislain Konan', 'Wilfried Singo', 'Odilon Kossounou', 'Evan Ndicka', 'Willy Boly', 'Emmanuel Agbadou', 'Ousmane Diomande', 'Franck Kessie', 'Seko Fofana', 'Ibrahim Sangare', 'Jean-Philippe Gbamin', 'Amad Diallo', 'Sébastien Haller', 'Simon Adingra', 'Yan Diomande', 'Evann Guessand', 'Oumar Diakite'] },
  { code: 'JPN', name: 'Japan', players: ['Zion Suzuki', 'Henry Heroki Mochizuki', 'Ayumu Seko', 'Junnosuke Suzuki', 'Shogo Taniguchi', 'Tsuyoshi Watanabe', 'Kaishu Sano', 'Yuki Soma', 'Ao Tanaka', 'Daichi Kamada', 'Takefusa Kubo', 'Ritsu Doan', 'Keito Nakamura', 'Takumi Minamino', 'Shuto Machino', 'Junya Ito', 'Koki Ogawa', 'Ayase Ueda'] },
  { code: 'JOR', name: 'Jordan', players: ['Yazeed Abulaila', 'Ihsan Haddad', 'Mohammad Abu Hashish', 'Yazan Al-Arab', 'Abdallah Nasib', 'Saleem Obaid', 'Mohammad Abualnadi', 'Ibrahim Saadeh', 'Nizar Al-Rashdan', 'Noor Al-Rawabdeh', 'Mohannad Abu Taha', 'Amer Jamous', 'Musa Al-Taamari', 'Yazan Al-Naimat', 'Mahmoud Al-Mardi', 'Ali Olwan', 'Mohammad Abu Zrayq', 'Ibrahim Sabra'] },
  { code: 'MEX', name: 'Mexico', players: ['Luis Malagón', 'Johan Vasquez', 'Jorge Sánchez', 'Cesar Montes', 'Jesus Gallardo', 'Israel Reyes', 'Diego Lainez', 'Carlos Rodriguez', 'Edson Alvarez', 'Orbelin Pineda', 'Marcel Ruiz', 'Érick Sánchez', 'Hirving Lozano', 'Santiago Giménez', 'Raúl Jiménez', 'Alexis Vega', 'Roberto Alvarado', 'Cesar Huerta'] },
  { code: 'MAR', name: 'Morocco', players: ['Yassine Bounou', 'Munir El Kajoui', 'Achraf Hakimi', 'Noussair Mazraoui', 'Nayef Aguerd', 'Roman Saiss', 'Jawad El Yamio', 'Adam Masina', 'Sofyan Amrabat', 'Azzedine Ounahi', 'Eliesse Ben Seghir', 'Bilal El Khannouss', 'Ismael Saibari', 'Youssef En-Nesyri', 'Abde Ezzalzouli', 'Soufiane Rahimi', 'Brahim Diaz', 'Ayoub El Kaabi'] },
  { code: 'NED', name: 'Netherlands', players: ['Bart Verbruggen', 'Virgil van Dijk', 'Micky van de Ven', 'Jurrien Timber', 'Denzel Dumfries', 'Nathan Aké', 'Jeremie Frimpong', 'Jan Paul van Hecke', 'Tijjani Reijnders', 'Ryan Gravenberch', 'Teun Koopmeiners', 'Frenkie de Jong', 'Xavi Simons', 'Justin Kluivert', 'Memphis Depay', 'Donyell Malen', 'Wout Weghorst', 'Cody Gakpo'] },
  { code: 'NZL', name: 'New Zealand', players: ['Max Crocombe Payne', 'Alex Paulsen', 'Michael Boxall', 'Liberato Cacace', 'Tim Payne', 'Tyler Bindon', 'Francis de Vries', 'Finn Surman', 'Joe Bell', 'Sarpreet Singh', 'Ryan Thomas', 'Matthew Garbett', 'Marko Stamenić', 'Ben Old', 'Chris Wood', 'Elijah Just', 'Callum McCowatt', 'Kosta Barbarouses'] },
  { code: 'NOR', name: 'Norway', players: ['Orjan Nyland', 'Julian Ryerson', 'Leo Ostigård', 'Kristoffer Vassbakk Ajer', 'Marcus Holmgren Pedersen', 'David Møller Wolfe', 'Torbjørn Heggem', 'Morten Thorsby', 'Martin Ødegaard', 'Sander Berge', 'Andreas Schjelderup', 'Patrick Berg', 'Erling Haaland', 'Alexander Sørloth', 'Aron Dønnum', 'Jorgen Strand Larsen', 'Antonio Nusa', 'Oscar Bobb'] },
  { code: 'PAN', name: 'Panama', players: ['Orlando Mosquera', 'Luis Mejia', 'Fidel Escobar', 'Andres Andrade', 'Michael Amir Murillo', 'Eric Davis', 'Jose Cordoba', 'Cesar Blackman', 'Cristian Martinez', 'Aníbal Godoy', 'Adalberto Carrasquilla', 'Édgar Bárcenas', 'Carlos Harvey', 'Ismael Díaz', 'Jose Fajardo', 'Cecilio Waterman', 'Jose Luiz Rodriguez', 'Alberto Quintero'] },
  { code: 'PAR', name: 'Paraguay', players: ['Roberto Fernandez', 'Orlando Gill', 'Gustavo Gomez', 'Fabián Balbuena', 'Juan José Cáceres', 'Omar Alderete', 'Junior Alonso', 'Mathías Villasanti', 'Diego Gomez', 'Damián Bobadilla', 'Andres Cubas', 'Matias Galarza Fonda', 'Julio Enciso', 'Alejandro Romero Gamarra', 'Miguel Almirón', 'Ramon Sosa', 'Angel Romero', 'Antonio Sanabria'] },
  { code: 'POR', name: 'Portugal', players: ['Diogo Costa', 'Jose Sa', 'Ruben Dias', 'João Cancelo', 'Diogo Dalot', 'Nuno Mendes', 'Gonçalo Inácio', 'Bernardo Silva', 'Bruno Fernandes', 'Ruben Neves', 'Vitinha', 'João Neves', 'Cristiano Ronaldo', 'Francisco Trincao', 'João Felix', 'Gonçalo Ramos', 'Pedro Neto', 'Rafael Leão'] },
  { code: 'QAT', name: 'Qatar', players: ['Meshaal Barsham', 'Sultan Albrake', 'Lucas Mendes', 'Homam Ahmed', 'Boualem Khoukhi', 'Pedro Miguel', 'Tarek Salman', 'Mohamed Al-Mannai', 'Karim Boudiaf', 'Assim Madibo', 'Ahmed Fatehi', 'Mohammed Waad', 'Abdulaziz Hatem', 'Hassan Al-Haydos', 'Edmilson Junior', 'Akram Hassan Afif', 'Ahmed Al Ganehi', 'Almoez Ali'] },
  { code: 'KSA', name: 'Saudi Arabia', players: ['Nawaf Alaqidi', 'Abdulrahman Al-Sanbi', 'Saud Abdulhamid', 'Nawaf Bouwashl', 'Jihad Thakri', 'Moteb Al-Harbi', 'Hassan Altambakti', 'Musab Aljuwayr', 'Ziyad Aljohani', 'Abdullah Alkhaibari', 'Nasser Aldawsari', 'Saleh Abu Alshamat', 'Marwan Alsahafi', 'Salem Aldawsari', 'Abdulrahman Al-Aboud', 'Feras Akbrikan', 'Saleh Alshehri', 'Abdullah Al-Hamdan'] },
  { code: 'SCO', name: 'Scotland', players: ['Angus Gunn', 'Jack Hendry', 'Kieran Tierney', 'Aaron Hickey', 'Andrew Robertson', 'Scott McKenna', 'John Souttar', 'Anthony Ralston', 'Grant Hanley', 'Scott McTominay', 'Billy Gilmour', 'Lewis Ferguson', 'Ryan Christie', 'Kenny McLean', 'John McGinn', 'Lyndon Dykes', 'Che Adams', 'Ben Gannon-Doak'] },
  { code: 'SEN', name: 'Senegal', players: ['Edouard Mendy', 'Yehvann Diouf', 'Moussa Niakhaté', 'Abdoulaye Seck', 'Ismail Jakobs', 'El Hadji Malick Diouf', 'Kalidou Koulibaly', 'Idrissa Gana Gueye', 'Pape Matar Sarr', 'Pape Gueye', 'Habib Diarra', 'Lamine Camara', 'Sadio Mane', 'Ismaïla Sarr', 'Boulaye Dia', 'Iliman Ndiaye', 'Nicolas Jackson', 'Krepin Diatta'] },
  { code: 'RSA', name: 'South Africa', players: ['Ronwen Williams', 'Sipho Chaine', 'Aubrey Modiba', 'Samukele Kabini', 'Mbekezeli Mbokazi', 'Khulumani Ndamane', 'Siyabonga Ngezana', 'Khuliso Mudau', 'Nkosinathi Sibisi', 'Teboho Mokoena', 'Thalente Mbatha', 'Bathasi Aubaas', 'Yaya Sithole', 'Sipho Mbule', 'Lyle Foster', 'Iqraam Rayners', 'Mohau Nkota', 'Oswin Appollis'] },
  { code: 'KOR', name: 'South Korea', players: ['Hyeon-woo Jo', 'Seung-Gyu Kim', 'Min-jae Kim', 'Yu-min Cho', 'Young-woo Seol', 'Han-beom Lee', 'Tae-seok Lee', 'Myung-jae Lee', 'Jae-sung Lee', 'In-beom Hwang', 'Kang-in Lee', 'Seung-ho Paik', 'Jens Castrop', 'Dongg-yeong Lee', 'Gue-sung Cho', 'Heung-min Son', 'Hee-chan Hwang', 'Hyeon-Gyu Oh'] },
  { code: 'ESP', name: 'Spain', players: ['Unai Simon', 'Robin Le Normand', 'Aymeric Laporte', 'Dean Huijsen', 'Pedro Porro', 'Dani Carvajal', 'Marc Cucurella', 'Martín Zubimendi', 'Rodri', 'Pedri', 'Fabian Ruiz', 'Mikel Merino', 'Lamine Yamal', 'Dani Olmo', 'Nico Williams', 'Ferran Torres', 'Álvaro Morata', 'Mikel Oyarzabal'] },
  { code: 'SWE', name: 'Sweden', players: ['Victor Johansson', 'Isak Hien', 'Gabriel Gudmundsson', 'Emil Holm', 'Victor Nilsson Lindelöf', 'Gustaf Lagerbielke', 'Lucas Bergvall', 'Hugo Larsson', 'Jesper Karlström', 'Yasin Ayari', 'Mattias Svanberg', 'Daniel Svensson', 'Ken Sema', 'Roony Bardghji', 'Dejan Kulusevski', 'Anthony Elanga', 'Alexander Isak', 'Viktor Gyökeres'] },
  { code: 'SUI', name: 'Switzerland', players: ['Gregor Kobel', 'Yvon Mvogo', 'Manuel Akanji', 'Ricardo Rodriguez', 'Nico Elvedi', 'Aurèle Amenda', 'Silvan Widmer', 'Granit Xhaka', 'Denis Zakaria', 'Remo Freuler', 'Fabian Rieder', 'Ardon Jashari', 'Johan Manzambi', 'Michel Aebischer', 'Breel Embolo', 'Ruben Vargas', 'Dan Ndoye', 'Zeki Amdouni'] },
  { code: 'TUN', name: 'Tunisia', players: ['Bechir Ben Said', 'Aymen Dahmen', 'Yan Valery', 'Montassar Talbi', 'Yassine Meriah', 'Ali Abdi', 'Dylan Bronn', 'Ellyes Skhiri', 'Aissa Laidouni', 'Ferjani Sassi', 'Mohamed Ali Ben Romdhane', 'Hannibal Mejbri', 'Elias Achouri', 'Elias Saad', 'Hazem Mastouri', 'Ismael Gharbi', 'Sayfallah Ltaief', 'Naim Sliti'] },
  { code: 'TUR', name: 'Türkiye', players: ['Ugurcan Cakir', 'Mert Muldur', 'Zeki Celik', 'Abdulkerim Bardakci', 'Caglar Soyuncu', 'Merih Demiral', 'Ferdi Kadioglu', 'Kaan Ayhan', 'Ismail Yuksek', 'Hakan Calhanoglu', 'Orkun Kokcu', 'Arda Guler', 'Irfan Can Kahveci', 'Yunus Akgun', 'Can Uzun', 'Baris Alper Yilmaz', 'Kerem Akturkoglu', 'Kenan Yildiz'] },
  { code: 'URU', name: 'Uruguay', players: ['Sergio Rochet', 'Santiago Mele', 'Ronald Araujo', 'José María Giménez', 'Sebastian Caceres', 'Mathias Olivera', 'Guillermo Varela', 'Nahitan Nandez', 'Federico Valverde', 'Giorgian De Arrascaeta', 'Rodrigo Bentancur', 'Manuel Ugarte', 'Nicolás de la Cruz', 'Maxi Araujo', 'Darwin Núñez', 'Federico Viñas', 'Rodrigo Aguirre', 'Facundo Pellistri'] },
  { code: 'USA', name: 'USA', players: ['Matt Freese', 'Chris Richards', 'Tim Ream', 'Mark McKenzie', 'Alex Freeman', 'Antonee Robinson', 'Tyler Adams', 'Tanner Tessmann', 'Weston McKennie', 'Christian Roldan', 'Timothy Weah', 'Diego Luna', 'Malik Tillman', 'Christian Pulisic', 'Brenden Aaronson', 'Ricardo Pepi', 'Haji Wright', 'Folarin Balogun'] },
  { code: 'UZB', name: 'Uzbekistan', players: ['Utkir Yusupov', 'Farrukh Savfiev', 'Sherzod Nasrullaev', 'Umar Eshmurodov', 'Husniddin Aliqulov', 'Rustamjon Ashurmatov', 'Khojiakbar Alijonov', 'Abdukodir Khusanov', 'Odiljon Hamrobekov', 'Otabek Shukurov', 'Jamshid Iskanderov', 'Azizbek Turgunboev', 'Khojimat Erkinov', 'Eldor Shomurodov', 'Oston Urunov', 'Jaloliddin Masharipov', 'Igor Sergeev', 'Abbosbek Fayzullaev'] },
]

const TEAM_STICKERS: Sticker[] = TEAM_DATA.flatMap(t => makeTeam(t.code, t.name, t.players))

export const CORE_STICKERS: Sticker[] = [...INTRO_STICKERS, ...TEAM_STICKERS]

export const STICKERS: Sticker[] = [...CORE_STICKERS, ...BONUS_STICKERS]

export const STICKERS_MAP: Record<string, Sticker> = Object.fromEntries(STICKERS.map(s => [s.code, s]))

export const TEAMS: TeamInfo[] = TEAM_DATA.map(t => ({ code: t.code, name: t.name }))

export const INTRO_TEAM: TeamInfo = { code: 'FWC', name: 'Introducción' }

function t(...codes: string[]): TeamInfo[] {
  return codes.map(code => {
    const found = TEAMS.find(t => t.code === code)
    if (!found) throw new Error(`Team not found: ${code}`)
    return found
  })
}

export interface AlbumGroup {
  label: string
  teams: TeamInfo[]
}

export const ALBUM_GROUPS: AlbumGroup[] = [
  { label: 'Introducción', teams: [INTRO_TEAM] },
  { label: 'Grupo A', teams: t('MEX', 'RSA', 'KOR', 'CZE') },
  { label: 'Grupo B', teams: t('CAN', 'BIH', 'QAT', 'SUI') },
  { label: 'Grupo C', teams: t('BRA', 'MAR', 'HAI', 'SCO') },
  { label: 'Grupo D', teams: t('USA', 'PAR', 'AUS', 'TUR') },
  { label: 'Grupo E', teams: t('GER', 'CUW', 'CIV', 'ECU') },
  { label: 'Grupo F', teams: t('NED', 'JPN', 'SWE', 'TUN') },
  { label: 'Grupo G', teams: t('BEL', 'EGY', 'IRN', 'NZL') },
  { label: 'Grupo H', teams: t('ESP', 'CPV', 'KSA', 'URU') },
  { label: 'Grupo I', teams: t('FRA', 'SEN', 'IRQ', 'NOR') },
  { label: 'Grupo J', teams: t('ARG', 'ALG', 'AUT', 'JOR') },
  { label: 'Grupo K', teams: t('POR', 'COD', 'UZB', 'COL') },
  { label: 'Grupo L', teams: t('ENG', 'CRO', 'GHA', 'PAN') },
]

export const BONUS_ALBUM_GROUPS: AlbumGroup[] = [
  { label: 'Coca Cola', teams: [BONUS_TEAM] },
]

export const DISPLAY_ALBUM_GROUPS: AlbumGroup[] = [...ALBUM_GROUPS, ...BONUS_ALBUM_GROUPS]

export const STICKER_PREFIXES: string[] = [...new Set(STICKERS.map(sticker => sticker.code.match(/^[A-Z]+/)?.[0]).filter(Boolean) as string[])]

export function isBonusSticker(sticker: Pick<Sticker, 'teamCode'>): boolean {
  return sticker.teamCode === BONUS_TEAM.code
}

export function isBonusTeamCode(teamCode: string): boolean {
  return teamCode.toUpperCase() === BONUS_TEAM.code
}

export function getTeamStickers(teamCode: string): Sticker[] {
  if (teamCode === 'FWC') return INTRO_STICKERS
  if (teamCode === BONUS_TEAM.code) return BONUS_STICKERS
  return TEAM_STICKERS.filter(s => s.teamCode === teamCode)
}

export function getTeamByCode(code: string): TeamInfo | undefined {
  if (code === 'FWC') return INTRO_TEAM
  if (code === BONUS_TEAM.code) return BONUS_TEAM
  return TEAMS.find(t => t.code === code)
}

