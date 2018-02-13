/**
 * @requires asmcrypto.js
 * @requires crypto/public_key
 * @requires crypto/pkcs1
 * @requires util
 * @module crypto/signature */

'use strict';

import { RSA_RAW } from 'asmcrypto.js'
import publicKey from './public_key';
import pkcs1 from './pkcs1';
import util from '../util';

export default {
  /**
   *
   * @param {module:enums.publicKey} algo public Key algorithm
   * @param {module:enums.hash} hash_algo Hash algorithm
   * @param {Array<module:type/mpi>} msg_MPIs Signature multiprecision integers
   * @param {Array<module:type/mpi>} publickey_MPIs Public key multiprecision integers
   * @param {Uint8Array} data Data on where the signature was computed on.
   * @return {Boolean} true if signature (sig_data was equal to data over hash)
   */
  verify: async function(algo, hash_algo, msg_MPIs, publickey_MPIs, data) {
    var m;
    var r;
    var s;
    var Q;
    var curve;

    data = util.Uint8Array2str(data);

    switch (algo) {
      case 1:
        // RSA (Encrypt or Sign) [HAC]
      case 2:
        // RSA Encrypt-Only [HAC]
      case 3:
        // RSA Sign-Only [HAC]
        var rsa = new publicKey.rsa();
        var n = util.str2Uint8Array(publickey_MPIs[0].toBytes());
        var k = publickey_MPIs[0].byteLength();
        var e = util.str2Uint8Array(publickey_MPIs[1].toBytes());
        m = msg_MPIs[0].write().slice(2); // FIXME
        var EM = RSA_RAW.verify(m, [n, e]);
        var EM2 = pkcs1.emsa.encode(hash_algo, data, k);
        return util.hexidump(EM) === EM2;
      case 16:
        // Elgamal (Encrypt-Only) [ELGAMAL] [HAC]
        throw new Error("signing with Elgamal is not defined in the OpenPGP standard.");
      case 17:
        // DSA (Digital Signature Algorithm) [FIPS186] [HAC]
        var dsa = new publicKey.dsa();
        var s1 = msg_MPIs[0].toBigInteger();
        var s2 = msg_MPIs[1].toBigInteger();
        var p = publickey_MPIs[0].toBigInteger();
        var q = publickey_MPIs[1].toBigInteger();
        var g = publickey_MPIs[2].toBigInteger();
        var y = publickey_MPIs[3].toBigInteger();
        m = data;
        var dopublic = dsa.verify(hash_algo, s1, s2, m, p, q, g, y);
        return dopublic.compareTo(s1) === 0;
      case 19:
        // ECDSA
        var ecdsa = publicKey.elliptic.ecdsa;
        curve = publickey_MPIs[0];
        r = msg_MPIs[0].toBigInteger();
        s = msg_MPIs[1].toBigInteger();
        m = data;
        Q = publickey_MPIs[1].toBigInteger();
        return ecdsa.verify(curve.oid, hash_algo, {r: r, s: s}, m, Q);
      case 22:
        // EdDSA
        var eddsa = publicKey.elliptic.eddsa;
        curve = publickey_MPIs[0];
        r = msg_MPIs[0].toBigInteger();
        s = msg_MPIs[1].toBigInteger();
        m = data;
        Q = publickey_MPIs[1].toBigInteger();
        return eddsa.verify(curve.oid, hash_algo, { R: r, S: s }, m, Q);
      default:
        throw new Error('Invalid signature algorithm.');
    }
  },

  /**
   * Create a signature on data using the specified algorithm
   * @param {module:enums.publicKey} algo Asymmetric cipher algorithm to use (See {@link https://tools.ietf.org/html/rfc4880#section-9.1|RFC 4880 9.1})
   * @param {module:enums.hash} hash_algo hash Algorithm to use (See {@link https://tools.ietf.org/html/rfc4880#section-9.4|RFC 4880 9.4})
   * @param {Array<module:type/mpi>} keyIntegers Public followed by Private key multiprecision algorithm-specific parameters
   * @param {Uint8Array} data Data to be signed
   * @return {Array<module:type/mpi>}
   */
  sign: async function(algo, hash_algo, keyIntegers, data) {

    data = util.Uint8Array2str(data);

    var m;
    var d;
    var curve;
    var signature;

    switch (algo) {
      case 1:
        // RSA (Encrypt or Sign) [HAC]
      case 2:
        // RSA Encrypt-Only [HAC]
      case 3:
        // RSA Sign-Only [HAC]
        var rsa = new publicKey.rsa();
        var n = util.str2Uint8Array(keyIntegers[0].toBytes());
        var k = keyIntegers[0].byteLength();
        var e = util.str2Uint8Array(keyIntegers[1].toBytes());
        d = util.str2Uint8Array(keyIntegers[2].toBytes());
        m = util.hex2Uint8Array(
          '00'+pkcs1.emsa.encode(hash_algo, data, k) // FIXME
        );
        return util.Uint8Array2MPI(RSA_RAW.sign(m, [n, e, d]));
      case 17:
        // DSA (Digital Signature Algorithm) [FIPS186] [HAC]
        var dsa = new publicKey.dsa();
        var p = keyIntegers[0].toBigInteger();
        var q = keyIntegers[1].toBigInteger();
        var g = keyIntegers[2].toBigInteger();
        var x = keyIntegers[4].toBigInteger();
        m = data;
        var result = dsa.sign(hash_algo, m, g, p, q, x);
        return util.str2Uint8Array(result[0].toString() + result[1].toString());
      case 16:
        // Elgamal (Encrypt-Only) [ELGAMAL] [HAC]
        throw new Error('Signing with Elgamal is not defined in the OpenPGP standard.');
      case 19:
        // ECDSA
        var ecdsa = publicKey.elliptic.ecdsa;
        curve = keyIntegers[0];
        d = keyIntegers[2].toBigInteger();
        m = data;
        signature = await ecdsa.sign(curve.oid, hash_algo, m, d);
        return util.str2Uint8Array(signature.r.toMPI() + signature.s.toMPI());
      case 22:
        // EdDSA
        var eddsa = publicKey.elliptic.eddsa;
        curve = keyIntegers[0];
        d = keyIntegers[2].toBigInteger();
        m = data;
        signature = await eddsa.sign(curve.oid, hash_algo, m, d);
        return util.concatUint8Array([
          util.Uint8Array2MPI(signature.R.toArrayLike(Uint8Array, 'le', 32)),
          util.Uint8Array2MPI(signature.S.toArrayLike(Uint8Array, 'le', 32))
        ]);
      default:
        throw new Error('Invalid signature algorithm.');
    }
  }
};
