export interface Reserva {
    CodReserva: number;
    CodPersonaInterna: number;
    CodEspacio: number;
    CodTipoEvento: number;
    CodPersonaExterna: number | null;
    Razon: string;
    EstadoSolicitud: string;
    EsPersonaExterna: number;
    EventoAcademico: number;
    Dia: string;
    HoraInicio: string;
    HoraFin: string;
    FechaCreacion: Date;
    Estado: string;
}

export interface ReservaEspacioInfo {
    CodReserva: number;
    CodRepaso: number | null;
    CodPersonaInterna: number;
    NombrePersonaInterna: string;
    ApellidoPaternoPersonaInterna: string;
    ApellidoMaternoPersonaInterna: string;
    CodEspacio: number;
    CodTipoEspacio: number;
    NombreTipoEspacio: string;
    NombreEspacio: string;
    Disponibilidad: string;
    RutaFoto: string;
    NombreFoto: string;
    CodUnidad: number;
    CodTipoEvento: number;
    NombreTipoEvento: string;
    CodPersonaExterna: number | null;
    NombrePersonaExterna: string | null;
    ApellidoPaternoPersonaExterna: string | null;
    ApellidoMaternoPersonaExterna: string | null;
    OrganizacionPersonaExterna: string | null;
    Razon: string;
    EstadoSolicitud: string;
    EsPersonaExterna: number;
    EventoAcademico: number;
    Dia: string;
    HoraInicio: string;
    HoraFin: string;
    FechaCreacion: Date;
    Estado: string;
    EstadoEspacio: string;
}

export interface ReservaEspacioCalendar {
    CodReserva: number;
    CodRepaso: number | null;
    CodPersonaInterna: number;
    CodEspacio: number;
    CodTipoEspacio: number;
    NombreEspacio: string;
    CodUnidad: number;
    CodTipoEvento: number;
    CodPersonaExterna: number | null;
    Razon: string;
    EstadoSolicitud: string;
    EsPersonaExterna: number;
    EventoAcademico: number;
    Dia: string;
    HoraInicio: string;
    HoraFin: string;
    FechaCreacion: Date;
    Estado: string;
}

export interface ReservaInfo {
    CodReserva: number;
    CodPersonaInterna: number;
    CodPersonaInternaDirigenteEspacio: string;
    NombrePersonaInterna: string;
    ApellidoPaternoPersonaInterna: string;
    ApellidoMaternoPersonaInterna: string;
    CodEspacio: number;
    CodTipoEspacio: number;
    NombreEspacio: string;
    RutaFoto: string;
    NombreFoto: string;
    CodUnidad: number;
    CodTipoEvento: number;
    NombreTipoEvento: string;
    CodPersonaExterna: number | null;
    NombrePersonaExterna: string | null;
    ApellidoPaternoPersonaExterna: string | null;
    ApellidoMaternoPersonaExterna: string | null;
    OrganizacionPersonaExterna: string | null;
    Razon: string;
    EstadoSolicitud: string;
    EsPersonaExterna: number;
    EventoAcademico: number;
    Dia: string;
    HoraInicio: string;
    HoraFin: string;
    FechaCreacion: Date;
    Estado: string;
    EstadoEspacio: string;
    EstadoTipoEvento: string;
}

export interface RepasoInfo {
    CodReserva: number;
    CodRepaso: number;
    Dia: string;
    HoraInicio: string;
    HoraFin: string;
    Estado: string;
}