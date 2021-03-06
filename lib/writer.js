"use strict";

(() => {
  function write(ast) {
    function type_body(it) {
      if (it.union) {
        const subtypes = it.idlType.map(type).join("");
        return `${it.trivia.open}(${subtypes}${it.trivia.close})`;
      } else if (it.generic) {
        const genericName = `${it.trivia.base}${it.generic.value}`;
        const subtypes = it.idlType.map(type).join("");
        const { trivia } = it.generic;
        const bracket = `${trivia.open}<${subtypes}${trivia.close}>`;
        return `${genericName}${bracket}`;
      } 
      const prefix = it.prefix ? (it.prefix.trivia + it.prefix.value) : "";
      const base = it.trivia.base + it.baseName;
      const postfix = it.postfix ? (it.postfix.trivia + it.postfix.value) : "";
      return `${prefix}${base}${postfix}`;
    }
    function type(it) {
      const ext = extended_attributes(it.extAttrs);
      const body = type_body(it);
      const nullable = it.nullable ? `${it.nullable.trivia}?` : "";
      const separator = it.separator ? (it.separator.trivia + it.separator.value) : "";

      return `${ext}${body}${nullable}${separator}`;
    }
    function const_value(it) {
      const tp = it.type;
      if (tp === "boolean") return it.value ? "true" : "false";
      else if (tp === "null") return "null";
      else if (tp === "Infinity") return (it.negative ? "-" : "") + "Infinity";
      else if (tp === "NaN") return "NaN";
      else if (tp === "number") return it.value;
      else return `"${it.value}"`;
    }
    function default_(def) {
      const assign = `${def.trivia.assign}=`;
      if (def.type === "sequence") {
        return `${assign}${def.trivia.open}[${def.trivia.close}]`;
      }
      return `${assign}${def.trivia.value}${const_value(def)}`;
    }
    function argument(arg) {
      let ret = extended_attributes(arg.extAttrs);
      if (arg.optional) ret += `${arg.optional.trivia}optional`;
      ret += type(arg.idlType);
      if (arg.variadic) ret += `${arg.variadic.trivia}...`;
      ret += `${arg.trivia.name}${arg.escapedName}`;
      if (arg.default) ret += default_(arg.default);
      if (arg.separator) ret += `${arg.separator.trivia}${arg.separator.value}`;
      return ret;
    }
    function identifier(id) {
      let ret = id.trivia + id.value;
      if (id.separator) ret += id.separator.trivia + id.separator.value;
      return ret;
    }
    function make_ext_at(it) {
      let ret = it.trivia.name + it.name;
      if (it.rhs) {
        if (it.rhs.type === "identifier-list") ret += `${it.rhs.trivia.assign}=${it.rhs.trivia.open}(${it.rhs.value.map(identifier).join("")}${it.rhs.trivia.close})`;
        else ret += `${it.rhs.trivia.assign}=${it.rhs.trivia.value}${it.rhs.value}`;
      }
      if (it.signature) ret += `${it.signature.trivia.open}(${it.signature.arguments.map(argument).join("")}${it.signature.trivia.close})`;
      if (it.separator) ret += `${it.separator.trivia}${it.separator.value}`;
      return ret;
    }
    function extended_attributes(eats) {
      if (!eats) return "";
      return `${eats.trivia.open}[${eats.items.map(make_ext_at).join("")}${eats.trivia.close}]`;
    }

    function operation(it) {
      let ret = extended_attributes(it.extAttrs);
      for (const mod of ["getter", "setter", "deleter", "stringifier", "static"]) {
        if (it[mod]) ret += `${it[mod].trivia}${mod}`;
      }
      if (it.body) {
        const { body } = it;
        ret += type(body.idlType);
        if (body.name) ret += body.name.trivia + body.name.escaped;
        ret += `${body.trivia.open}(${body.arguments.map(argument).join("")}${body.trivia.close})`;
      }
      ret += it.trivia.termination + ";";
      return ret;
    }

    function attribute(it) {
      let ret = extended_attributes(it.extAttrs);
      if (it.static) ret += `${it.static.trivia}static`;
      if (it.stringifier) ret += `${it.stringifier.trivia}stringifier`;
      if (it.inherit) ret += `${it.inherit.trivia}inherit`;
      if (it.readonly) ret += `${it.readonly.trivia}readonly`;
      ret += `${it.trivia.base}attribute${type(it.idlType)}${it.trivia.name}${it.escapedName};`;
      return ret;
    }

    function inheritance(inh) {
      return `${inh.trivia.colon}:${inh.trivia.name}${inh.name}`;
    }

    function interface_(it) {
      let ret = extended_attributes(it.extAttrs);
      if (it.partial) ret += `${it.partial.trivia}partial`;
      ret += `${it.trivia.base}interface${it.trivia.name}${it.escapedName}`;
      if (it.inheritance) ret += inheritance(it.inheritance);
      ret += `${it.trivia.open}{${iterate(it.members)}${it.trivia.close}}${it.trivia.termination};`;
      return ret;
    }

    function interface_mixin(it) {
      let ret = extended_attributes(it.extAttrs);
      if (it.partial) ret += `${it.partial.trivia}partial`;
      ret += `${it.trivia.base}interface${it.trivia.mixin}mixin${it.trivia.name}${it.escapedName}`;
      ret += `${it.trivia.open}{${iterate(it.members)}${it.trivia.close}}${it.trivia.termination};`;
      return ret;
    }

    function namespace(it) {
      let ret = extended_attributes(it.extAttrs);
      if (it.partial) ret += `${it.partial.trivia}partial`;
      ret += `${it.trivia.base}namespace${it.trivia.name}${it.escapedName}`;
      ret += `${it.trivia.open}{${iterate(it.members)}${it.trivia.close}}${it.trivia.termination};`;
      return ret;
    }

    function dictionary(it) {
      let ret = extended_attributes(it.extAttrs);
      if (it.partial) ret += `${it.partial.trivia}partial`;
      ret += `${it.trivia.base}dictionary${it.trivia.name}${it.escapedName}`;
      if (it.inheritance) ret += inheritance(it.inheritance);
      ret += `${it.trivia.open}{${iterate(it.members)}${it.trivia.close}}${it.trivia.termination};`;
      return ret;
    }
    function field(it) {
      let ret = extended_attributes(it.extAttrs);
      if (it.required) ret += `${it.required.trivia}required`;
      ret += `${type(it.idlType)}${it.trivia.name}${it.escapedName}`;
      if (it.default) ret += default_(it.default);
      ret += `${it.trivia.termination};`;
      return ret;
    }
    function const_(it) {
      const ret = extended_attributes(it.extAttrs);
      return `${ret}${it.trivia.base}const${type(it.idlType)}${it.trivia.name}${it.name}${it.trivia.assign}=${it.trivia.value}${const_value(it.value)}${it.trivia.termination};`;
    }
    function typedef(it) {
      const ret = extended_attributes(it.extAttrs);
      return `${ret}${it.trivia.base}typedef${type(it.idlType)}${it.trivia.name}${it.escapedName}${it.trivia.termination};`;
    }
    function includes(it) {
      const ret = extended_attributes(it.extAttrs);
      return `${ret}${it.trivia.target}${it.target}${it.trivia.includes}includes${it.trivia.mixin}${it.includes}${it.trivia.termination};`;
    }
    function callback(it) {
      const ext = extended_attributes(it.extAttrs);
      const head = `${it.trivia.base}callback${it.trivia.name}${it.name}`;
      const args = it.arguments.map(argument).join("");
      const signature = `${type(it.idlType)}${it.trivia.open}(${args}${it.trivia.close})`;
      return `${ext}${head}${it.trivia.assign}=${signature}${it.trivia.termination};`;
    }
    function enum_(it) {
      const ext = extended_attributes(it.extAttrs);
      const values = it.values.map(v => {
        const body = `${v.trivia}"${v.value}"`;
        return v.separator ? `${body}${v.separator.trivia}${v.separator.value}` : body;
      }).join("");
      return `${ext}${it.trivia.base}enum${it.trivia.name}${it.escapedName}${it.trivia.open}{${values}${it.trivia.close}}${it.trivia.termination};`;
    }
    function iterable_like(it) {
      const readonly = it.readonly ? `${it.readonly.trivia}readonly` : "";
      const bracket = `${it.trivia.open}<${it.idlType.map(type).join("")}${it.trivia.close}>`;
      return `${readonly}${it.trivia.base}${it.type}${bracket}${it.trivia.termination};`;
    }
    function callbackInterface(it) {
      return `${it.trivia.callback}callback${interface_(it)}`;
    }
    function eof(it) {
      return it.trivia;
    }

    const table = {
      interface: interface_,
      "interface mixin": interface_mixin,
      namespace,
      operation,
      attribute,
      dictionary,
      field,
      const: const_,
      typedef,
      includes,
      callback,
      enum: enum_,
      iterable: iterable_like,
      legacyiterable: iterable_like,
      maplike: iterable_like,
      setlike: iterable_like,
      "callback interface": callbackInterface,
      eof
    };
    function dispatch(it) {
      const dispatcher = table[it.type];
      if (!dispatcher) {
        throw new Error(`Type "${it.type}" is unsupported`);
      }
      return table[it.type](it);
    }
    function iterate(things) {
      if (!things) return;
      let ret = "";
      for (const thing of things) ret += dispatch(thing);
      return ret;
    }
    return iterate(ast);
  }


  const obj = {
    write
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = obj;
  } else if (typeof define === 'function' && define.amd) {
    define([], () => obj);
  } else {
    (self || window).WebIDL2Writer = obj;
  }
})();
