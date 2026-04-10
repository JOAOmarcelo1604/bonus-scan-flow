import { describe, expect, it } from "vitest";
import { extrairNumBonusCodigoBarras } from "./extrairNumBonusCodigoBarras";

describe("extrairNumBonusCodigoBarras", () => {
  it("extrai 702127 do exemplo da etiqueta (trecho 000010702127)", () => {
    const s = "0107891738000720330000107021271402403231501880009140052";
    expect(extrairNumBonusCodigoBarras(s)).toBe(702127);
  });

  it("extrai do exemplo longo inicial (Insomnia)", () => {
    const s = "01878917380006463330000100821331319807702337012700261410";
    expect(extrairNumBonusCodigoBarras(s)).toBe(82133);
  });

  it("aceita espaços e caracteres não numéricos", () => {
    const s = "01878917380006463330000100821331319807702337012700261410 95";
    expect(extrairNumBonusCodigoBarras(s)).toBe(82133);
  });
});
