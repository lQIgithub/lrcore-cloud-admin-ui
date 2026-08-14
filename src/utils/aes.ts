import CryptoJS from "crypto-js";
import JSONBig from "json-bigint";


const AES_KEY = "7w5A8s2D9f0G1h3J5k6L8z0C2v4B6n8M";
const CSRF_TOKEN_KEY = "x-csrf-token";

// 推荐配置：仅超大数字转为BigInt；storeAsString=true 直接转字符串
const jsonBig = JSONBig({storeAsString: true})

const aesEncrypt = (data: any, key: string = AES_KEY): string => {
  try {
    const keyParsed = CryptoJS.enc.Utf8.parse(key);
    const jsonData = typeof data === "string" ? data : JSON.stringify(data);
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(jsonData, keyParsed, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const ciphertext = encrypted.ciphertext;
    const combined = CryptoJS.lib.WordArray.create([...iv.words, ...ciphertext.words]);
    return CryptoJS.enc.Base64.stringify(combined);
  } catch (error) {
    console.error("AES 加密失败:", error);
    throw new Error("数据加密失败", {cause: error});
  }
};

const aesDecrypt = (encryptedData: any, key: string = AES_KEY): any => {
  try {
    const keyParsed = CryptoJS.enc.Utf8.parse(key);
    const bytes = CryptoJS.enc.Base64.parse(encryptedData);
    const iv = CryptoJS.lib.WordArray.create(bytes.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(bytes.words.slice(4));
    const decrypted = CryptoJS.AES.decrypt({ciphertext} as any, keyParsed, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    try {
      return jsonBig.parse(decryptedStr);
    } catch {
      return decryptedStr;
    }
  } catch (error) {
    console.error("AES 解密失败:", error);
    throw new Error("数据解密失败", {cause: error});
  }
};

export function encryptRequestData(data: any): string {
  return aesEncrypt(data);
}

export function decryptResponseData(encryptedData: any): any {
  return aesDecrypt(encryptedData);
}
