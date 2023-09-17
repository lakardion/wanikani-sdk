import axios from "axios";
const WANIKANI_URL = "https://api.wanikani.com/v2";

let token = "";
export const client = axios.create({
  baseURL: WANIKANI_URL,
});

export const updateWnkToken = (newToken: string) => {
  token = newToken;
};

client.interceptors.request.use(
  (config) => {
    config.headers["Content-Type"] = `application/x-www-form-urlencoded`;
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  },
  (err) => {
    Promise.reject(err);
  }
);
