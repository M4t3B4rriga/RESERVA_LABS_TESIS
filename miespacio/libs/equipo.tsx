export interface Equipo {
    CodEquipo: number;
    NombreEquipo: string;
    Cantidad: number;
    EstaInstalado: string;
    Marca: string;
    Modelo: string;
    CodEspacio: number;
    NombreEspacio: string;
    CodTipoEquipo: number;
    NombreTipoEquipo: string;
    Estado: string;
}

export interface EquipoForEspacio {
    CodEquipo: number;
    NombreEquipo: string;
    Cantidad: number;
    EstaInstalado: string;
    Marca: string;
    Modelo: string;
    CodEspacio: number;
    CodTipoEquipo: number;
    Estado: string;
}

export interface EquipoForReservation {
    CodEquipo: number;
    NombreEquipo: string;
    Cantidad: number;
    CodEspacio: number;
    CodTipoEquipo: number;
    NombreTipoEquipo: string;
    Estado: string;
}