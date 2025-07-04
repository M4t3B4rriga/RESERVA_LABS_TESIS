import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import url from 'url';
import { TipoEspacio } from '@/libs/tipoEspacio';
import { OkPacket } from 'mysql2';

interface QueryParams {
  [key: string]: string | string[];
}

interface GetTipoEspaciosParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getTipoEspacios(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetTipoEspaciosParams = {}) {
  try {
    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['PK_TMETIPO_ESPACIO', 'TES_NOMBRE', 'TES_DESCRIPCION', 'ESTADO'];
    orderBy = allowedOrderBy.includes(orderBy || '') ? orderBy : 'PK_TMETIPO_ESPACIO';
    const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
    orderDir = allowedOrderDir.includes(orderDir || '') ? orderDir : 'ASC';
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
      whereConditions.push(`TES_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
              SELECT
                PK_TMETIPO_ESPACIO as CodTipoEspacio,
                TES_NOMBRE as NombreTipoEspacio,
                TES_DESCRIPCION as DescripcionTipoEspacio,
                ESTADO as Estado
              FROM T_METIPO_ESPACIO
              ${whereClause}
              ${orderClause}
              LIMIT ${limit}
              OFFSET ${offset}
            `;
const countQuery = `SELECT COUNT(*) as count FROM T_METIPO_ESPACIO ${whereClause}`;


    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const TipoEspacios = result as TipoEspacio[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ TipoEspacios, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los tipos de espacio' });
  }
}

async function createTipoEspacio(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreTipoEspacio, DescripcionTipoEspacio } = req.body;
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_METIPO_ESPACIO (TES_NOMBRE, TES_DESCRIPCION, ESTADO) VALUES (?, ?, 1)',
      [NombreTipoEspacio, DescripcionTipoEspacio]
    );
    const nuevoTipoEspacio: TipoEspacio = {
      CodTipoEspacio: result.insertId,
      NombreTipoEspacio,
      DescripcionTipoEspacio,
      Estado: '1',
    };
    res.status(201).json(nuevoTipoEspacio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el tipo de espacio' });
  }
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TipoEspacio[] | TipoEspacio | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getTipoEspacios(req, res, {
        filter: filter ? filter.toString() : undefined, 
        search: search ? search.toString() : undefined, 
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createTipoEspacio(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}