export interface PersonaInterna {
    CodPersonaInterna: number;
    CodUnidad: number;
    Nombre: string;
    ApellidoPaterno: string;
    ApellidoMaterno: string;
    CarnetID: string;
    EmailInstitucional: string;
    EmailPersonal: string;
    Telefono: string;
    Cedula: string;
}

export interface PersonaInternaUnidad {
    CodPersonaInterna: number;
    CodUnidad: number;
    NombreUnidad: string;
    SiglasUnidad: string;
    Nombre: string;
    ApellidoPaterno: string;
    ApellidoMaterno: string;
    CarnetID: string;
    EmailInstitucional: string;
    EmailPersonal: string;
    Telefono: string;
    Cedula: string;
}

export interface PersonaInternaUsuario {
    CodPersonaInterna: number;
    CodUnidad: number;
    CodUsuario: number;
    Nombre: string;
    ApellidoPaterno: string;
    ApellidoMaterno: string;
    CarnetID: string;
    EmailInstitucional: string;
    EmailPersonal: string;
    Telefono: string;
    Cedula: string;
}

export interface PersonaExterna {
    CodPersonaExterna: number;
    Nombre: string;
    ApellidoPaterno: string;
    ApellidoMaterno: string;
    EmailPersonal: string;
    Telefono: string;
    Cedula: string;
    Organizacion: string;
    Estado: string;
}
