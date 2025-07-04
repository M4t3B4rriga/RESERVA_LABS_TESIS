import { FotoEspacio } from '@/libs/fotoEspacio';

export interface Espacio {
    CodEspacio: number;
    CodTipoEspacio: number;
    NombreTipoEspacio: string;
    DescripcionTipoEspacio: string;
    CodUnidad: number;
    NombreUnidad: string;
    SiglasUnidad: string;
    DescripcionUnidad: string;
    NombreEspacio: string;
    DescripcionEspacio: string;
    CapacidadEspacio: number;
    DescripcionUbicacion: string;
    DiasAntelacion: number;
    Disponibilidad: number;
    FechaCreacion: Date;
    FechaEdicion: Date;
    Estado: string;
    NombreFoto: string;
    RutaFoto: string;
    Orden: number;
    Estado_Foto: string;
    Estado_TipoEspacio: string;
    Estado_Unidad: string;
}

export interface Espacio_ID {
    CodEspacio: number;
    NombreEspacio: string;
    DescripcionEspacio: string;
    CapacidadEspacio: number;
    DescripcionUbicacion: string;
    Disponibilidad: number;
    DiasAntelacion: number;
    FechaCreacion: Date;
    FechaEdicion: Date;
    Estado: string;
    CodTipoEspacio: number;
    CodUnidad: number;
    CodUsuario: number;
    NombreTipoEspacio: string;
    DescripcionTipoEspacio: string;
    NombreUnidad: string;
    DescripcionUnidad: string;
    SiglasUnidad: string;
    Estado_TipoEspacio: string;
    Estado_Unidad: string;
}

export interface Espacio_Create {
    CodEspacio: number;
    NombreEspacio: string;
    DescripcionEspacio: string;
    CapacidadEspacio: number;
    DescripcionUbicacion: string;
    Disponibilidad: number;
    DiasAntelacion: number;
    FechaCreacion: Date;
    FechaEdicion: Date;
    Estado: string;
    CodTipoEspacio: number;
    CodUnidad: number;
    CodUsuario: number;
}

export interface DirigenteEspacio_EspID {
    CodDirigente: number;
    CodUsuario: number;
    NombreUsuario: string;
    ApellidoPaternoUsuario: string;
    ApellidoMaternoUsuario: string;
    CarnetID: string;
    CodEspacio: number;
    FechaAsignacion: Date;
    FechaRetiro: Date;
    Estado: string;
}

export interface Espacio_Tiny {
    CodEspacio: number;
    NombreEspacio: string;
    Disponibilidad: number;
    Estado: string;
}