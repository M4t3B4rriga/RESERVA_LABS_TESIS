import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { ReservaInfo } from '@/libs/reserva';
import { jwtVerify } from 'jose';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetReservasParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getReservas(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetReservasParams = {}) {
  try {
    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy: { [key: string]: string } = {
      CodReserva: 'r.PK_TMRRESERVA',
      Dia: 'r.RES_DIA',
      NombreEspacio: 'e.ESP_NOMBRE',
      TipoEvento: 'tev.TEV_NOMBRE',
      EstadoSolicitud: 'r.RES_ESTADO_SOLICITUD',
      EventoAcademico: 'r.RES_EVENTO_ACADEMICO',
      EsPersonaExterna: 'r.RES_ES_PERSONA_EXT',
      FechaCreacion: 'r.RES_FECHA_CREACION',
    };
    if (orderBy) {
      orderBy = allowedOrderBy[orderBy || ''] ? allowedOrderBy[orderBy] : 'r.RES_DIA';
    }
    const allowedOrderDir = ['ASC', 'DESC'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'DESC';
    const filterConditions: { [key: string]: string[] } = {};
    const filterSinceCurrentDate = `r.RES_DIA >= CURDATE()`;
    const isDiasAnteriores = filter?.includes('DiasAnteriores-1');

    if (filter) {
      // Separar los filtros.
      const filterParams = filter ? filter.split(',') : [];
      const allowedAttributes: { [key: string]: string } = {
        CodReserva: 'r.PK_TMRRESERVA',
        CodEspacio: 'e.PK_TMEESPACIO',
        Persona: 'r.PK_TMCPERSONA_INTERNA',
        Externo: 'r.PK_TMCPERSONA_EXTERNA',
        CodTipoEvento: 'tev.PK_TMRTIPO_EVENTO',
        CodTipoEspacio: 'e.PK_TMETIPO_ESPACIO',
        CodUnidad: 'e.PK_TMEUNIDAD',
        Estado: 'r.ESTADO',
        EstadoSolicitud: 'r.RES_ESTADO_SOLICITUD',
        EventoAcademico: 'r.RES_EVENTO_ACADEMICO',
        EsPersonaExterna: 'r.RES_ES_PERSONA_EXT',
        DiasAnteriores: '',
      };

      // Construimos la cláusula WHERE en base a los filtros y la cadena de búsqueda.
      filterParams.forEach(param => {
        const [attribute, value] = param.split('-');
        if (!allowedAttributes[attribute]) {
          console.error(`El atributo ${attribute} no está permitido`);
          return;
        }

        if (!value) {
          console.error(`Se debe proporcionar un valor para el atributo ${attribute}`);
          return;
        }

        if (!filterConditions[allowedAttributes[attribute]]) {
          filterConditions[allowedAttributes[attribute]] = [];
        }

        filterConditions[allowedAttributes[attribute]].push(`${allowedAttributes[attribute]} = '${value}'`);
      });
    }

    const filterGroups = Object.values(filterConditions).map(group => `(${group.join(' OR ')})`);

    if (search) {
      filterGroups.push(`
        (CONCAT(pi.PEI_NOMBRE, ' ', pi.PEI_APELLIDO_PATERNO) LIKE '%${search}%' OR 
        CONCAT(pi.PEI_NOMBRE, ' ', pi.PEI_APELLIDO_MATERNO) LIKE '%${search}%' OR
        CONCAT(pi.PEI_APELLIDO_PATERNO, ' ', pi.PEI_NOMBRE) LIKE '%${search}%' OR
        CONCAT(pi.PEI_APELLIDO_MATERNO, ' ', pi.PEI_NOMBRE) LIKE '%${search}%' OR
        e.ESP_NOMBRE LIKE '%${search}%')
      `)
    }

    const whereClause = filterGroups.length > 0 ? `WHERE ${filterGroups.join(' AND ')} ${!isDiasAnteriores ? 'AND ' + filterSinceCurrentDate : ''}` : `WHERE ${!isDiasAnteriores ? filterSinceCurrentDate : ''}`;
    const orderClause = orderBy ? `ORDER BY r.RES_ESTADO_SOLICITUD DESC, ${orderBy} ${orderDir || 'DESC'}` : 'ORDER BY r.RES_ESTADO_SOLICITUD DESC';
    const query = `
      SELECT
        r.PK_TMRRESERVA as CodReserva,
        r.PK_TMCPERSONA_INTERNA as CodPersonaInterna,
        pi.PEI_NOMBRE as NombrePersonaInterna,
        pi.PEI_APELLIDO_PATERNO as ApellidoPaternoPersonaInterna,
        pi.PEI_APELLIDO_MATERNO as ApellidoMaternoPersonaInterna,
        e.PK_TMEESPACIO as CodEspacio,
        e.ESP_NOMBRE as NombreEspacio,
        e.PK_TMETIPO_ESPACIO as CodTipoEspacio,
        f.FES_RUTA as RutaFoto,
        f.FES_NOMBRE as NombreFoto,
        e.PK_TMEUNIDAD as CodUnidad,
        r.PK_TMRTIPO_EVENTO as CodTipoEvento,
        tev.TEV_NOMBRE as NombreTipoEvento,
        r.PK_TMCPERSONA_EXTERNA as CodPersonaExterna,
        pe.PEE_NOMBRE as NombrePersonaExterna,
        pe.PEE_APELLIDO_PATERNO as ApellidoPaternoPersonaExterna,
        pe.PEE_APELLIDO_MATERNO as ApellidoMaternoPersonaExterna,
        pe.PEE_ORGANIZACION as OrganizacionPersonaExterna,
        r.RES_RAZON as Razon,
        r.RES_ESTADO_SOLICITUD as EstadoSolicitud,
        r.RES_ES_PERSONA_EXT as EsPersonaExterna,
        r.RES_EVENTO_ACADEMICO as EventoAcademico,
        r.RES_DIA as Dia,
        r.RES_HORA_INICIO as HoraInicio,
        r.RES_HORA_FIN as HoraFin,
        r.RES_FECHA_CREACION as FechaCreacion,
        r.ESTADO as Estado,
        e.ESTADO as EstadoEspacio,
        tev.ESTADO as EstadoTipoEvento,
        (SELECT GROUP_CONCAT(PK_TMCPERSONA_INTERNA) FROM T_MEDIRIGENTE_ESPACIO WHERE PK_TMEESPACIO = e.PK_TMEESPACIO AND ESTADO = 1) AS CodPersonaInternaDirigenteEspacio
      FROM T_MRRESERVA r
      JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO
      LEFT JOIN T_MEFOTO_ESPACIO f ON e.PK_TMEESPACIO = f.PK_TMEESPACIO AND f.ESTADO = 1 AND f.FES_ORDEN = (
        SELECT MIN(FES_ORDEN) FROM T_MEFOTO_ESPACIO WHERE PK_TMEESPACIO = e.PK_TMEESPACIO AND ESTADO = 1
      )
      JOIN T_MCPERSONA_INTERNA pi ON r.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
      LEFT JOIN T_MCPERSONA_EXTERNA pe ON r.PK_TMCPERSONA_EXTERNA = pe.PK_TMCPERSONA_EXTERNA
      LEFT JOIN T_MRTIPO_EVENTO tev ON r.PK_TMRTIPO_EVENTO = tev.PK_TMRTIPO_EVENTO
      ${whereClause}
      ${orderClause}
      LIMIT ${limit}
      OFFSET ${offset};
    `;


    const countQuery = `
    SELECT COUNT(*) as count 
    FROM T_MRRESERVA r
      JOIN T_MEESPACIO e ON r.PK_TMEESPACIO = e.PK_TMEESPACIO
      JOIN T_MCPERSONA_INTERNA pi ON r.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA
    ${whereClause}`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const reservas = result as ReservaInfo[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ reservas, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener las reservas' });
  }
}

/* async function createEspacio(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      CodTipoEspacio,
      CodUnidad,
      NombreEspacio,
      DescripcionEspacio,
      CapacidadEspacio,
      DescripcionUbicacion,
      DiasAntelacion,
      PersonasInternas
    } = req.body;

    const FechaCreacion = new Date(Date.now());
    const FechaEdicion = FechaCreacion;
    const Disponibilidad = 1;

    const { miEspacioSession } = req.cookies;

    if (miEspacioSession === undefined) {
      res.status(401).json({ message: 'No se ha iniciado sesión' });
      return;
    }

    const { payload } = await jwtVerify(
      miEspacioSession,
      new TextEncoder().encode('secret')
    );

    const CodUsuario = payload?.CodUsuario;

    const [espacioResult] = await pool.query<OkPacket>(
      'INSERT INTO T_MEESPACIO (PK_TMEUNIDAD, PK_TMCPERSONA_INTERNA, PK_TMETIPO_ESPACIO, ESP_NOMBRE, ESP_DESCRIPCION, ESP_CAPACIDAD, ESP_DESCRIPCION_UBICACION, ESP_DISPONIBILIDAD, ESP_DIAS_ANTELACION, ESP_FECHA_CREACION, ESP_FECHA_EDICION, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        CodUnidad,
        CodUsuario,
        CodTipoEspacio,
        NombreEspacio,
        DescripcionEspacio,
        CapacidadEspacio,
        DescripcionUbicacion,
        Disponibilidad,
        DiasAntelacion,
        FechaCreacion,
        FechaEdicion,
        1
      ]
    );

    const nuevoEspacio: Espacio_Create = {
      CodEspacio: espacioResult.insertId,
      CodTipoEspacio,
      CodUnidad,
      CodUsuario: CodUsuario as number,
      NombreEspacio,
      DescripcionEspacio,
      CapacidadEspacio,
      DescripcionUbicacion,
      Disponibilidad,
      DiasAntelacion,
      FechaCreacion,
      FechaEdicion,
      Estado: '1',
    };

    const dirigentesValues = PersonasInternas.map((personaInterna: number) => [nuevoEspacio.CodEspacio, personaInterna, FechaCreacion, 1]);

    await pool.query<OkPacket>(
      'INSERT INTO T_MEDIRIGENTE_ESPACIO (PK_TMEESPACIO, PK_TMCPERSONA_INTERNA, DES_FECHA_ASIGNACION, ESTADO) VALUES ?',
      [dirigentesValues]
    );
    console.log(nuevoEspacio);
    res.status(201).json(nuevoEspacio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el espacio' });
  }
} */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReservaInfo[] | ReservaInfo | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getReservas(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir?.toString().toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      /* await createEspacio(req, res); */
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}