import { getKey, getRandom, getIV, getSeed} from "./cryptKey.js";


/**
 * getCrypt
 * @param pwd {string}
 * @param salt {Uint8Array<ArrayBuffer>}
 * @param iv {Uint8Array<ArrayBuffer>}
 * @param keyLen {number}
 * @param rndLen {number}
 * @param iterations {number}
 * @param extractable {boolean}
 * @returns {Promise<{salt: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, pwd: string, encrypt: (function(ArrayBuffer): Promise<ArrayBuffer>), decrypt: (function(ArrayBuffer): Promise<ArrayBuffer>)}>}
 */
export async function getCrypt(pwd, salt, iv, keyLen = 256, rndLen = 16, iterations = 524288, extractable = false) {

    const _salt = await getSeed(salt);
    const _iv = await getSeed(iv);
    const _key = await getKey(pwd, _salt, keyLen, iterations, extractable);

    const algo = {
        name: "AES-CBC",
        _iv
    };

    /**
     * encrypt
     * @param buffer {ArrayBuffer}
     * @returns {ArrayBuffer}
     */
    const _encrypt = async function (buffer) {


        return  crypto.subtle.encrypt(
            algo,
            _key,
            buffer);
    }

    /**
     * decrypt
     * @param buffer {ArrayBuffer}
     * @returns {ArrayBuffer}
     */
    const _decrypt = async function (buffer) {

        return  crypto.subtle.decrypt(
            algo,
            _key,
            buffer);
    }


    return {
        salt: _salt,
        iv: _iv,
        pwd: pwd,
        encrypt: _encrypt,
        decrypt: _decrypt
    }
}



