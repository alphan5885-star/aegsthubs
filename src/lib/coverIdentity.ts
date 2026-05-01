// Random sahte gönderici kimliği üretici (OPSEC için)
const FIRST = ["Alex","Sam","Jordan","Taylor","Morgan","Casey","Riley","Quinn","Avery","Blake","Cameron","Drew","Emerson","Finley","Gray","Harper","Indigo","Jamie","Kai","Logan","Marlowe","Noel","Oakley","Parker","Reese","Sage","Tatum","Vesper","Wren","Zion"];
const LAST = ["Smith","Johnson","Brown","Lee","Garcia","Martinez","Davis","Miller","Wilson","Anderson","Thomas","Moore","Jackson","Martin","White","Harris","Clark","Lewis","Walker","Hall","Young","King","Wright","Scott","Green","Adams","Baker","Nelson","Carter","Mitchell"];
const STREETS = ["Main St","Oak Ave","Maple Rd","Cedar Ln","Pine St","Elm St","Birch Way","Park Ave","High St","Church St","Mill Rd","River Rd","Hill St","Spring St","Lake Ave"];
const CITIES_BY_COUNTRY: Record<string,string[]> = {
  US:["New York","Los Angeles","Chicago","Houston","Phoenix"],
  GB:["London","Manchester","Birmingham","Leeds","Liverpool"],
  DE:["Berlin","Munich","Hamburg","Cologne","Frankfurt"],
  FR:["Paris","Marseille","Lyon","Toulouse","Nice"],
  TR:["Istanbul","Ankara","Izmir","Bursa","Antalya"],
  RU:["Moscow","Saint Petersburg","Novosibirsk","Yekaterinburg","Kazan"],
  NL:["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven"],
  CA:["Toronto","Vancouver","Montreal","Calgary","Ottawa"],
};

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function generateCoverIdentity(country: string = "US") {
  const first = rand(FIRST);
  const last = rand(LAST);
  const streetNum = Math.floor(Math.random() * 9000) + 100;
  const street = rand(STREETS);
  const cities = CITIES_BY_COUNTRY[country] || ["Capital City","Riverside","Greenville","Springfield","Franklin"];
  const city = rand(cities);
  const zip = String(Math.floor(Math.random() * 90000) + 10000);
  return {
    name: `${first} ${last}`,
    address: `${streetNum} ${street}`,
    city,
    zip,
    country,
    full: `${first} ${last}\n${streetNum} ${street}\n${city}, ${zip}\n${country}`,
  };
}

export const STEALTH_METHODS = [
  { id: "regular", labelKey: "stealth.regular" },
  { id: "vacuum_sealed", labelKey: "stealth.vacuum" },
  { id: "mylar", labelKey: "stealth.mylar" },
  { id: "decoy", labelKey: "stealth.decoy" },
  { id: "double_vacuum_mylar", labelKey: "stealth.double" },
] as const;

export const SHIPPING_CARRIERS = [
  { id: "stealth_mail", labelKey: "carrier.stealthMail" },
  { id: "ems_intl", labelKey: "carrier.ems" },
  { id: "dhl_dropoff", labelKey: "carrier.dhl" },
  { id: "ups_dropoff", labelKey: "carrier.ups" },
  { id: "fedex_dropoff", labelKey: "carrier.fedex" },
  { id: "local_post", labelKey: "carrier.localPost" },
  { id: "hand_courier", labelKey: "carrier.handCourier" },
  { id: "po_box", labelKey: "carrier.poBox" },
] as const;
