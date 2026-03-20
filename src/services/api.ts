import axios from "axios";
import type { BiparRequest, EtiquetaLida, AuditoriaRequest, AuditoriaModel } from "@/types/api";

const api = axios.create({
  baseURL: "http://localhost:8088",
  timeout: 10000,
});

export async function biparEtiqueta(data: BiparRequest): Promise<EtiquetaLida> {
  const res = await api.post<EtiquetaLida>("/etiqueta-lida/bipar", data);
  return res.data;
}

export async function enviarAuditoria(data: AuditoriaRequest): Promise<AuditoriaModel> {
  const res = await api.post<AuditoriaModel>("/api/auditoria/enviar", data);
  return res.data;
}

export async function listarAuditorias(): Promise<AuditoriaModel[]> {
  const res = await api.get<AuditoriaModel[]>("/api/auditoria");
  return res.data;
}

export async function listarEtiquetas(): Promise<EtiquetaLida[]> {
  const res = await api.get<EtiquetaLida[]>("/etiqueta-lida");
  return res.data;
}
