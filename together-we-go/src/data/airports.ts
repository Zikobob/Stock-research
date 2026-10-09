/** Major international airports (IATA, coordinates, IANA time zone). Works fully offline. */
export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  tz: string;
}

const A = (iata: string, name: string, city: string, country: string, lat: number, lng: number, tz: string): Airport => ({
  iata, name, city, country, lat, lng, tz,
});

export const airports: Airport[] = [
  // Japan & East Asia
  A('HND', 'Haneda Airport', 'Tokyo', 'Japan', 35.5494, 139.7798, 'Asia/Tokyo'),
  A('NRT', 'Narita International', 'Tokyo', 'Japan', 35.772, 140.3929, 'Asia/Tokyo'),
  A('KIX', 'Kansai International', 'Osaka', 'Japan', 34.4347, 135.244, 'Asia/Tokyo'),
  A('ITM', 'Osaka Itami', 'Osaka', 'Japan', 34.7855, 135.4382, 'Asia/Tokyo'),
  A('NGO', 'Chubu Centrair', 'Nagoya', 'Japan', 34.8584, 136.8054, 'Asia/Tokyo'),
  A('CTS', 'New Chitose', 'Sapporo', 'Japan', 42.7752, 141.6923, 'Asia/Tokyo'),
  A('FUK', 'Fukuoka Airport', 'Fukuoka', 'Japan', 33.5859, 130.4511, 'Asia/Tokyo'),
  A('OKA', 'Naha Airport', 'Okinawa', 'Japan', 26.1958, 127.6459, 'Asia/Tokyo'),
  A('ICN', 'Incheon International', 'Seoul', 'South Korea', 37.4602, 126.4407, 'Asia/Seoul'),
  A('GMP', 'Gimpo International', 'Seoul', 'South Korea', 37.5583, 126.7906, 'Asia/Seoul'),
  A('PEK', 'Beijing Capital', 'Beijing', 'China', 40.0799, 116.6031, 'Asia/Shanghai'),
  A('PVG', 'Shanghai Pudong', 'Shanghai', 'China', 31.1443, 121.8083, 'Asia/Shanghai'),
  A('HKG', 'Hong Kong International', 'Hong Kong', 'China', 22.308, 113.9185, 'Asia/Hong_Kong'),
  A('TPE', 'Taoyuan International', 'Taipei', 'Taiwan', 25.0797, 121.2342, 'Asia/Taipei'),
  // South-East Asia & India
  A('SIN', 'Changi Airport', 'Singapore', 'Singapore', 1.3644, 103.9915, 'Asia/Singapore'),
  A('BKK', 'Suvarnabhumi', 'Bangkok', 'Thailand', 13.69, 100.7501, 'Asia/Bangkok'),
  A('DMK', 'Don Mueang', 'Bangkok', 'Thailand', 13.9126, 100.6067, 'Asia/Bangkok'),
  A('DPS', 'Ngurah Rai International', 'Bali', 'Indonesia', -8.7482, 115.1675, 'Asia/Makassar'),
  A('CGK', 'Soekarno–Hatta', 'Jakarta', 'Indonesia', -6.1256, 106.6559, 'Asia/Jakarta'),
  A('KUL', 'Kuala Lumpur International', 'Kuala Lumpur', 'Malaysia', 2.7456, 101.7099, 'Asia/Kuala_Lumpur'),
  A('MNL', 'Ninoy Aquino International', 'Manila', 'Philippines', 14.5086, 121.0198, 'Asia/Manila'),
  A('HAN', 'Noi Bai International', 'Hanoi', 'Vietnam', 21.2187, 105.8042, 'Asia/Ho_Chi_Minh'),
  A('SGN', 'Tan Son Nhat', 'Ho Chi Minh City', 'Vietnam', 10.8188, 106.6519, 'Asia/Ho_Chi_Minh'),
  A('DEL', 'Indira Gandhi International', 'New Delhi', 'India', 28.5562, 77.1, 'Asia/Kolkata'),
  A('BOM', 'Chhatrapati Shivaji Maharaj', 'Mumbai', 'India', 19.0896, 72.8656, 'Asia/Kolkata'),
  A('BLR', 'Kempegowda International', 'Bengaluru', 'India', 13.1986, 77.7066, 'Asia/Kolkata'),
  A('MLE', 'Velana International', 'Malé', 'Maldives', 4.1918, 73.5291, 'Indian/Maldives'),
  // Middle East & Africa
  A('DXB', 'Dubai International', 'Dubai', 'UAE', 25.2532, 55.3657, 'Asia/Dubai'),
  A('DOH', 'Hamad International', 'Doha', 'Qatar', 25.2731, 51.6081, 'Asia/Qatar'),
  A('IST', 'Istanbul Airport', 'Istanbul', 'Türkiye', 41.2753, 28.7519, 'Europe/Istanbul'),
  A('CAI', 'Cairo International', 'Cairo', 'Egypt', 30.1219, 31.4056, 'Africa/Cairo'),
  A('RAK', 'Marrakesh Menara', 'Marrakech', 'Morocco', 31.6069, -8.0363, 'Africa/Casablanca'),
  A('CPT', 'Cape Town International', 'Cape Town', 'South Africa', -33.9715, 18.6021, 'Africa/Johannesburg'),
  A('JNB', 'O. R. Tambo International', 'Johannesburg', 'South Africa', -26.1367, 28.2411, 'Africa/Johannesburg'),
  A('NBO', 'Jomo Kenyatta International', 'Nairobi', 'Kenya', -1.3192, 36.9278, 'Africa/Nairobi'),
  // Europe
  A('LHR', 'Heathrow', 'London', 'United Kingdom', 51.47, -0.4543, 'Europe/London'),
  A('LGW', 'Gatwick', 'London', 'United Kingdom', 51.1537, -0.1821, 'Europe/London'),
  A('CDG', 'Charles de Gaulle', 'Paris', 'France', 49.0097, 2.5479, 'Europe/Paris'),
  A('ORY', 'Orly', 'Paris', 'France', 48.7262, 2.3652, 'Europe/Paris'),
  A('AMS', 'Schiphol', 'Amsterdam', 'Netherlands', 52.3105, 4.7683, 'Europe/Amsterdam'),
  A('FRA', 'Frankfurt Airport', 'Frankfurt', 'Germany', 50.0379, 8.5622, 'Europe/Berlin'),
  A('MUC', 'Munich Airport', 'Munich', 'Germany', 48.3537, 11.775, 'Europe/Berlin'),
  A('BER', 'Berlin Brandenburg', 'Berlin', 'Germany', 52.3667, 13.5033, 'Europe/Berlin'),
  A('ZRH', 'Zurich Airport', 'Zurich', 'Switzerland', 47.4582, 8.5555, 'Europe/Zurich'),
  A('GVA', 'Geneva Airport', 'Geneva', 'Switzerland', 46.2381, 6.109, 'Europe/Zurich'),
  A('VIE', 'Vienna International', 'Vienna', 'Austria', 48.1103, 16.5697, 'Europe/Vienna'),
  A('PRG', 'Václav Havel Airport', 'Prague', 'Czechia', 50.1008, 14.26, 'Europe/Prague'),
  A('FCO', 'Leonardo da Vinci–Fiumicino', 'Rome', 'Italy', 41.8003, 12.2389, 'Europe/Rome'),
  A('MXP', 'Milan Malpensa', 'Milan', 'Italy', 45.6306, 8.7281, 'Europe/Rome'),
  A('VCE', 'Venice Marco Polo', 'Venice', 'Italy', 45.5053, 12.3519, 'Europe/Rome'),
  A('PSA', 'Pisa International', 'Pisa', 'Italy', 43.6839, 10.3927, 'Europe/Rome'),
  A('MAD', 'Adolfo Suárez Madrid–Barajas', 'Madrid', 'Spain', 40.4983, -3.5676, 'Europe/Madrid'),
  A('BCN', 'Josep Tarradellas Barcelona–El Prat', 'Barcelona', 'Spain', 41.2974, 2.0833, 'Europe/Madrid'),
  A('LIS', 'Humberto Delgado', 'Lisbon', 'Portugal', 38.7742, -9.1342, 'Europe/Lisbon'),
  A('OPO', 'Francisco Sá Carneiro', 'Porto', 'Portugal', 41.2481, -8.6814, 'Europe/Lisbon'),
  A('DUB', 'Dublin Airport', 'Dublin', 'Ireland', 53.4264, -6.2499, 'Europe/Dublin'),
  A('CPH', 'Copenhagen Airport', 'Copenhagen', 'Denmark', 55.618, 12.656, 'Europe/Copenhagen'),
  A('ARN', 'Stockholm Arlanda', 'Stockholm', 'Sweden', 59.6498, 17.9238, 'Europe/Stockholm'),
  A('OSL', 'Oslo Gardermoen', 'Oslo', 'Norway', 60.1976, 11.1004, 'Europe/Oslo'),
  A('KEF', 'Keflavík International', 'Reykjavík', 'Iceland', 63.985, -22.6056, 'Atlantic/Reykjavik'),
  A('ATH', 'Athens International', 'Athens', 'Greece', 37.9364, 23.9445, 'Europe/Athens'),
  A('JTR', 'Santorini (Thira)', 'Santorini', 'Greece', 36.3992, 25.4793, 'Europe/Athens'),
  // Oceania
  A('SYD', 'Sydney Kingsford Smith', 'Sydney', 'Australia', -33.9399, 151.1753, 'Australia/Sydney'),
  A('MEL', 'Melbourne Airport', 'Melbourne', 'Australia', -37.669, 144.841, 'Australia/Melbourne'),
  A('AKL', 'Auckland Airport', 'Auckland', 'New Zealand', -37.0082, 174.785, 'Pacific/Auckland'),
  // Americas
  A('JFK', 'John F. Kennedy International', 'New York', 'United States', 40.6413, -73.7781, 'America/New_York'),
  A('EWR', 'Newark Liberty', 'Newark', 'United States', 40.6895, -74.1745, 'America/New_York'),
  A('LGA', 'LaGuardia', 'New York', 'United States', 40.7769, -73.874, 'America/New_York'),
  A('PHL', 'Philadelphia International', 'Philadelphia', 'United States', 39.8744, -75.2424, 'America/New_York'),
  A('ILG', 'Wilmington Airport', 'Wilmington', 'United States', 39.6787, -75.6065, 'America/New_York'),
  A('BWI', 'Baltimore/Washington', 'Baltimore', 'United States', 39.1774, -76.6684, 'America/New_York'),
  A('IAD', 'Washington Dulles', 'Washington, D.C.', 'United States', 38.9531, -77.4565, 'America/New_York'),
  A('DCA', 'Reagan National', 'Washington, D.C.', 'United States', 38.8512, -77.0402, 'America/New_York'),
  A('BOS', 'Logan International', 'Boston', 'United States', 42.3656, -71.0096, 'America/New_York'),
  A('ATL', 'Hartsfield–Jackson', 'Atlanta', 'United States', 33.6407, -84.4277, 'America/New_York'),
  A('MCO', 'Orlando International', 'Orlando', 'United States', 28.4312, -81.3081, 'America/New_York'),
  A('MIA', 'Miami International', 'Miami', 'United States', 25.7959, -80.287, 'America/New_York'),
  A('CLT', 'Charlotte Douglas', 'Charlotte', 'United States', 35.214, -80.9431, 'America/New_York'),
  A('DTW', 'Detroit Metropolitan', 'Detroit', 'United States', 42.2162, -83.3554, 'America/Detroit'),
  A('ORD', "O'Hare International", 'Chicago', 'United States', 41.9742, -87.9073, 'America/Chicago'),
  A('DFW', 'Dallas/Fort Worth', 'Dallas', 'United States', 32.8998, -97.0403, 'America/Chicago'),
  A('IAH', 'George Bush Intercontinental', 'Houston', 'United States', 29.9902, -95.3368, 'America/Chicago'),
  A('MSP', 'Minneapolis–Saint Paul', 'Minneapolis', 'United States', 44.8848, -93.2223, 'America/Chicago'),
  A('DEN', 'Denver International', 'Denver', 'United States', 39.8561, -104.6737, 'America/Denver'),
  A('PHX', 'Phoenix Sky Harbor', 'Phoenix', 'United States', 33.4352, -112.0101, 'America/Phoenix'),
  A('LAS', 'Harry Reid International', 'Las Vegas', 'United States', 36.084, -115.1537, 'America/Los_Angeles'),
  A('LAX', 'Los Angeles International', 'Los Angeles', 'United States', 33.9416, -118.4085, 'America/Los_Angeles'),
  A('SFO', 'San Francisco International', 'San Francisco', 'United States', 37.6213, -122.379, 'America/Los_Angeles'),
  A('SEA', 'Seattle–Tacoma', 'Seattle', 'United States', 47.4502, -122.3088, 'America/Los_Angeles'),
  A('HNL', 'Daniel K. Inouye International', 'Honolulu', 'United States', 21.3245, -157.9251, 'Pacific/Honolulu'),
  A('YYZ', 'Toronto Pearson', 'Toronto', 'Canada', 43.6777, -79.6248, 'America/Toronto'),
  A('YVR', 'Vancouver International', 'Vancouver', 'Canada', 49.1967, -123.1815, 'America/Vancouver'),
  A('YYC', 'Calgary International', 'Calgary', 'Canada', 51.1215, -114.0076, 'America/Edmonton'),
  A('YUL', 'Montréal–Trudeau', 'Montreal', 'Canada', 45.4706, -73.7408, 'America/Toronto'),
  A('MEX', 'Benito Juárez International', 'Mexico City', 'Mexico', 19.4361, -99.0719, 'America/Mexico_City'),
  A('CUN', 'Cancún International', 'Cancún', 'Mexico', 21.0365, -86.877, 'America/Cancun'),
  A('GIG', 'Rio de Janeiro–Galeão', 'Rio de Janeiro', 'Brazil', -22.81, -43.2506, 'America/Sao_Paulo'),
  A('GRU', 'São Paulo–Guarulhos', 'São Paulo', 'Brazil', -23.4356, -46.4731, 'America/Sao_Paulo'),
  A('LIM', 'Jorge Chávez International', 'Lima', 'Peru', -12.0219, -77.1143, 'America/Lima'),
  A('CUZ', 'Alejandro Velasco Astete', 'Cusco', 'Peru', -13.5357, -71.9388, 'America/Lima'),
  A('BOG', 'El Dorado International', 'Bogotá', 'Colombia', 4.7016, -74.1469, 'America/Bogota'),
  A('EZE', 'Ministro Pistarini', 'Buenos Aires', 'Argentina', -34.8222, -58.5358, 'America/Argentina/Buenos_Aires'),
  A('SCL', 'Arturo Merino Benítez', 'Santiago', 'Chile', -33.393, -70.7858, 'America/Santiago'),
];

export const airportByIata = (code: string) =>
  airports.find((a) => a.iata === code.trim().toUpperCase());
