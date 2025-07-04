export interface Restriccion {
    CodRestriccion: number;
    CodEspacio: number;
    CodUsuario: number;
    FechaCreacion: Date;
    FechaEdicion: Date;
    Estado: string;
}

export interface Horario {
    CodHorario: number;
    CodRestriccion: number;
    Dia: number;
    HoraInicio: string;
    HoraFin: string;
    Estado: string;
}

export interface AvailabilityBox {
    id: number;
    dayIndex: number;
    startHour: string;
    duration: number;
}