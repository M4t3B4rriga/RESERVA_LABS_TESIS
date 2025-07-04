export interface Funcionalidad {
  PK_TMSFUNCIONALIDAD: number;
  FUN_NOMBRE: string;
  FUN_DESCRIPCION?: string;
  ESTADO: number;
}

export interface FuncionalidadCrud {
  CodFuncionalidad: number;
  NombreFuncionalidad: string;
  DescripcionFuncionalidad?: string;
  Estado: string;
}