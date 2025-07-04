import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { Unidad } from '@/libs/unidad';
import { insertAuditLog } from '@/src/components/Auditoria';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetUnidadesParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getUnidades(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetUnidadesParams = {}) {
  try {
    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['PK_TMEUNIDAD', 'UNI_NOMBRE', 'UNI_SIGLAS', 'ESTADO'];
    orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'PK_TMEUNIDAD';
    const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
    const whereConditions = [];
    const filterConditions = [] as string[];

    if (filter) {
      // Separar los filtros.
      const filterParams = filter ? filter.split(',') : [];
      const allowedAttributes = ['ESTADO'];

      // Construimos la cláusula WHERE en base a los filtros y la cadena de búsqueda.
      filterParams.forEach(param => {
        const [attribute, value] = param.split('-');
        if (!allowedAttributes.includes(attribute)) {
          console.error(`El atributo ${attribute} no está permitido`);
          return;
        }
        if (!value) {
          console.error(`Se debe proporcionar un valor para el atributo ${attribute}`);
          return;
        }

        filterConditions.push(`${attribute} = '${value}'`);
      });
    }
    if (filterConditions.length > 0) {
      whereConditions.push(`(${filterConditions.join(' OR ')})`);
    }

    if (search) {
      whereConditions.push(`UNI_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
        SELECT
          PK_TMEUNIDAD as CodUnidad,
          UNI_NOMBRE as NombreUnidad,
          UNI_SIGLAS as Siglas,
          UNI_DESCRIPCION as DescripcionUnidad,
          ESTADO as Estado
        FROM T_MEUNIDAD
        ${whereClause}
        ${orderClause}
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    const countQuery = `SELECT COUNT(*) as count FROM T_MEUNIDAD ${whereClause}`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const unidades = result as Unidad[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ unidades, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener las unidades' });
  }
}

async function createUnidad(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreUnidad, Siglas, DescripcionUnidad, CodPersonaInterna } = req.body;
    const Estado = '1';
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_MEUNIDAD (UNI_NOMBRE, UNI_SIGLAS, UNI_DESCRIPCION, ESTADO) VALUES (?, ?, ?, ?)',
      [NombreUnidad, Siglas, DescripcionUnidad, Estado]
    );

    if (CodPersonaInterna) {
      const [result2] = await pool.query<OkPacket>(
        'INSERT INTO T_MEDIRIGENTE_UNIDAD (PK_TMEUNIDAD, PK_TMCPERSONA_INTERNA, DUN_FECHA_ASIGNACION, ESTADO) VALUES (?, ?, ?, ?)',
        [result.insertId, CodPersonaInterna, new Date(), Estado]
      );
    }

    const nuevaUnidad: Unidad = {
      CodUnidad: result.insertId,
      NombreUnidad,
      Siglas,
      DescripcionUnidad,
      Estado: '1',
    };

    const { miEspacioSession } = req.cookies;
    if (miEspacioSession !== undefined) {
      await insertAuditLog(
        miEspacioSession,
        new Date().toISOString().slice(0, 10),
        new Date().toLocaleTimeString(),
        req.socket?.remoteAddress ?? "",
        `Crear unidad`,
        'Éxito',
        req.headers['user-agent']?.split(' ')[0] ?? "",
        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
      );
    }

    res.status(201).json(nuevaUnidad);
  } catch (error) {
    console.error(error);
    const { miEspacioSession } = req.cookies;
    if (miEspacioSession !== undefined) {
      await insertAuditLog(
        miEspacioSession,
        new Date().toISOString().slice(0, 10),
        new Date().toLocaleTimeString(),
        req.socket?.remoteAddress ?? "",
        `Crear unidad`,
        'Fracaso',
        req.headers['user-agent']?.split(' ')[0] ?? "",
        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
      );
    }
    res.status(500).json({ message: 'Error al crear LA UNIDAD' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Unidad[] | Unidad | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getUnidades(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createUnidad(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}