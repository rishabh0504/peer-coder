import type { LanguageParser } from "../../types.js";
import { createTreeSitterParser } from "./factory.js";

export function createTypescriptParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "typescript",
    extensions: [".ts", ".mts", ".cts"],
    grammarFile: "tree-sitter-typescript.wasm",
    map: {
      defs: {
        class_declaration: "class",
        abstract_class_declaration: "class",
        function_declaration: "function",
        generator_function_declaration: "function",
        interface_declaration: "interface",
        type_alias_declaration: "type",
        enum_declaration: "enum",
        method_definition: "method",
        public_field_definition: "field",
      },
      nameFields: ["name"],
      importTypes: ["import_statement"],
    },
  });
}

export function createTsxParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "tsx",
    extensions: [".tsx"],
    grammarFile: "tree-sitter-tsx.wasm",
    map: {
      defs: {
        class_declaration: "class",
        function_declaration: "function",
        interface_declaration: "interface",
        type_alias_declaration: "type",
        enum_declaration: "enum",
        method_definition: "method",
      },
      nameFields: ["name"],
      importTypes: ["import_statement"],
    },
  });
}

export function createJavascriptParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "javascript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    grammarFile: "tree-sitter-javascript.wasm",
    map: {
      defs: {
        class_declaration: "class",
        function_declaration: "function",
        method_definition: "method",
        generator_function_declaration: "function",
      },
      nameFields: ["name"],
      importTypes: ["import_statement"],
    },
  });
}

export function createPythonParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "python",
    extensions: [".py", ".pyi"],
    grammarFile: "tree-sitter-python.wasm",
    map: {
      defs: {
        class_definition: "class",
        function_definition: "function",
      },
      nameFields: ["name"],
      importTypes: ["import_statement", "import_from_statement"],
    },
  });
}

export function createGoParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "go",
    extensions: [".go"],
    grammarFile: "tree-sitter-go.wasm",
    map: {
      defs: {
        function_declaration: "function",
        method_declaration: "method",
        type_declaration: "type",
        type_spec: "type",
      },
      nameFields: ["name"],
      importTypes: ["import_declaration", "import_spec"],
    },
  });
}

export function createRustParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "rust",
    extensions: [".rs"],
    grammarFile: "tree-sitter-rust.wasm",
    map: {
      defs: {
        function_item: "function",
        struct_item: "struct",
        enum_item: "enum",
        trait_item: "trait",
        impl_item: "impl",
        mod_item: "module",
      },
      nameFields: ["name"],
      importTypes: ["use_declaration"],
    },
  });
}

export function createJavaParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "java",
    extensions: [".java"],
    grammarFile: "tree-sitter-java.wasm",
    map: {
      defs: {
        class_declaration: "class",
        interface_declaration: "interface",
        enum_declaration: "enum",
        method_declaration: "method",
        record_declaration: "record",
      },
      nameFields: ["name"],
      importTypes: ["import_declaration"],
    },
  });
}

export function createCParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "c",
    extensions: [".c", ".h"],
    grammarFile: "tree-sitter-c.wasm",
    map: {
      defs: {
        function_definition: "function",
        type_definition: "type",
        struct_specifier: "struct",
        enum_specifier: "enum",
      },
      nameFields: ["declarator", "name"],
      importTypes: ["preproc_include"],
    },
  });
}

export function createCppParser(): LanguageParser {
  return createTreeSitterParser({
    languageId: "cpp",
    extensions: [".cpp", ".cc", ".cxx", ".hpp", ".hh"],
    grammarFile: "tree-sitter-cpp.wasm",
    map: {
      defs: {
        function_definition: "function",
        class_specifier: "class",
        struct_specifier: "struct",
        type_definition: "type",
        enum_specifier: "enum",
      },
      nameFields: ["declarator", "name"],
      importTypes: ["preproc_include"],
    },
  });
}
