export interface ServicioEspecial {
    CodServicioEspecial: number;
    NombreServicioEspecial: string;
    DescripcionServicioEspecial: string;
    CodUnidad: string;
    Estado: string;
    NombreUnidad: string;
}

export interface ServicioEspecialReservas {
    CodServicioEspecial: number;
    NombreServicioEspecial: string;
    DescripcionServicioEspecial: string;
    CodUnidad: string;
    Estado: string;
}

export interface ServicioEspecialDirigentes {
    CodServicioEspecial: number;
    NombreServicioEspecial: string;
    DescripcionServicioEspecial: string;
    CodUnidad: string;
    CorreoInstitucionalDirigenteUnidad: string;
    CorreoPersonalDirigenteUnidad: string;
    Estado: string;
}