module.exports = class ParamUtil {

  /** integer string to integer */
  static getInt(s, _default = 0, _max = null) {
    if (!s) return _default;
    let ret;
    try {
      ret = parseInt(s);
      if (_max && ret > _max) ret = _max;
    } catch (e) {
      ret = _default;
    }
    return ret;
  }

  /** float string to float */
  static getFloat(s, _default = 0, _max = null) {
    if (!s) return _default;
    let ret;
    try {
      ret = parseFloat(s);
      if (_max && ret > _max) ret = _max;
    } catch (e) {
      ret = _default;
    }
    return ret;
  }

  static isNumeric(s) {
    if (!s) return false;
    return !isNaN(s);
  }

  static isInt(n) {
    return Number(n) === n && n % 1 === 0;
  }

  static isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
  }

  static isBoolean(b) {
    if (typeof(b) == typeof(true)) return true;
    return false;
  }

  static isBetween(n, { min, max, includeMin = true, includeMax = true }) {
    if (includeMin === true && includeMax === true) {
      return n >= min && n <= max;
    } else if (includeMin === true && includeMax === false) {
      return n >= min && n < max;
    } else if (includeMin === false && includeMax === true) {
      return n > min && n <= max;
    } else {
      return n > min && n < max;
    }
  }

  /** delete specified properties from array */
  static deletePropsFromArray(arr, props2delete = []) {
    for (let len = arr.length, i = 0; i < len; i++) {
      let item = arr[i];
      ParamUtil.deleteProps(item, props2delete);
    }
  }

  /** delete specified properties from object or array */
  static deleteProps(o, props2delete = []) {
    if (Array.isArray(o)) {
      ParamUtil.deletePropsFromArray(o, props2delete);
    } else {
      for (let len = props2delete.length, i = 0; i < len; i++) {
        delete o[props2delete[i]];
      }
    }
  }
};