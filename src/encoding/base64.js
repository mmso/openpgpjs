/* OpenPGP radix-64/base64 string encoding/decoding
 * Copyright 2005 Herbert Hanewinkel, www.haneWIN.de
 * version 1.0, check www.haneWIN.de for the latest version
 *
 * This software is provided as-is, without express or implied warranty.
 * Permission to use, copy, modify, distribute or sell this software, with or
 * without fee, for any purpose and by any individual or organization, is hereby
 * granted, provided that the above copyright notice and this paragraph appear
 * in all copies. Distribution as a part of an application or binary must
 * include the above copyright notice in the documentation and/or other materials
 * provided with the application or distribution.
 */

/**
 * @module encoding/base64
 */

'use strict';

var b64s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; // Standard radix-64
var b64u = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; // URL-safe radix-64

/**
 * Convert binary array to radix-64
 * @param {Uint8Array} t Uint8Array to convert
 * @param {bool} u if true, output is URL-safe
 * @returns {string} radix-64 version of input string
 * @static
 */
function s2r(t, u = false) {
  // TODO check btoa alternative
  var b64 = u ? b64u : b64s;
  var a, c, n;
  var r = [],
      l = 0,
      s = 0;
  var tl = t.length;

  for (n = 0; n < tl; n++) {
    c = t[n];
    if (s === 0) {
      r.push(b64.charAt((c >> 2) & 63));
      a = (c & 3) << 4;
    } else if (s === 1) {
      r.push(b64.charAt(a | ((c >> 4) & 15)));
      a = (c & 15) << 2;
    } else if (s === 2) {
      r.push(b64.charAt(a | ((c >> 6) & 3)));
      l += 1;
      if ((l % 60) === 0 && !u) {
        r.push("\n");
      }
      r.push(b64.charAt(c & 63));
    }
    l += 1;
    if ((l % 60) === 0 && !u) {
      r.push("\n");
    }

    s += 1;
    if (s === 3) {
      s = 0;
    }
  }
  if (s > 0) {
    r.push(b64.charAt(a));
    l += 1;
    if ((l % 60) === 0 && !u) {
      r.push("\n");
    }
    if (!u) {
      r.push('=');
      l += 1;
    }
  }
  if (s === 1 && !u) {
    if ((l % 60) === 0 && !u) {
      r.push("\n");
    }
    r.push('=');
  }
  return r.join('');
}

/**
 * Convert radix-64 to binary array
 * @param {String} t radix-64 string to convert
 * @param {bool} u if true, input is interpreted as URL-safe
 * @returns {Uint8Array} binary array version of input string
 * @static
 */
function r2s(t, u) {
  // TODO check atob alternative
  var b64 = u ? b64u : b64s;
  var c, n;
  var r = [],
    s = 0,
    a = 0;
  var tl = t.length;

  for (n = 0; n < tl; n++) {
    c = b64.indexOf(t.charAt(n));
    if (c >= 0) {
      if (s) {
        r.push(a | ((c >> (6 - s)) & 255));
      }
      s = (s + 2) & 7;
      a = (c << s) & 255;
    }
  }
  return new Uint8Array(r);
}

export default {
  encode: s2r,
  decode: r2s
};
