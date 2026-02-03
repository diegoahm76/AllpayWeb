export type Unlocked = {
  user: {value: string, error: boolean};
  document: {value: string, error: boolean};
  mobile: {value: string, error: boolean};
  email: {value: string, error: boolean};
  birthdate: {value: Date, error: boolean};
  typeDocument: {value: string, error: boolean};
};