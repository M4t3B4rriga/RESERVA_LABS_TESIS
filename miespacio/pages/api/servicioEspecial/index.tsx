import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { ServicioEspecial } from '@/libs/servicioEspecial';

import { cookies } from 'next/headers'
// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetServicioEspecialParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getServiciosEspeciales(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetServicioEspecialParams = {}) {
  try {
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['PK_TMRSERVICIO_ESPECIAL', 'SES_NOMBRE', 'SES_DESCRIPCION', 'SE.ESTADO', 'PK_TMEUNIDAD'];
    orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'PK_TMRSERVICIO_ESPECIAL';
    const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
    const whereConditions = [];
    const filterConditions = [] as string[];

    if (filter) {
      // Separar los filtros.
      const filterParams = filter ? filter.split(',') : [];
      const allowedAttributes = ['SE.ESTADO'];

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
      whereConditions.push(`SES_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
                  SELECT 
                  SE.PK_TMRSERVICIO_ESPECIAL as CodServicioEspecial, 
                  SE.SES_NOMBRE	as NombreServicioEspecial,
                  SE.SES_DESCRIPCION	as DescripcionServicioEspecial,
                  SE.ESTADO	as Estado,
                  U.PK_TMEUNIDAD as CodUnidad, 
                  U.UNI_NOMBRE as NombreUnidad
                  FROM T_MRSERVICIO_ESPECIAL SE
                  JOIN T_MEUNIDAD U
                  ON SE.PK_TMEUNIDAD=U.PK_TMEUNIDAD
                  ${whereClause}
                  ${orderClause}
                  
                  LIMIT ${limit}
                  OFFSET ${offset}
                `;
    const countQuery = `SELECT COUNT(*) as count FROM T_MRSERVICIO_ESPECIAL SE ${whereClause}`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const serviciosEspeciales = result as ServicioEspecial[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ serviciosEspeciales, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los servicios especiales' });
  }
}

async function createServicioEspecial(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreServicioEspecial, DescripcionServicioEspecial, CodUnidad } = req.body;
    const Estado = '1';
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_MRSERVICIO_ESPECIAL (SES_NOMBRE, SES_DESCRIPCION, PK_TMEUNIDAD, ESTADO) VALUES (?, ?, ?, ?)',
      [NombreServicioEspecial, DescripcionServicioEspecial, CodUnidad, Estado]
    );

    // Consulta la tabla UNIDAD para obtener el nombre de la unidad correspondiente al código de unidad que acabas de insertar.
    const [unidadResult] = await pool.query<RowDataPacket[]>(
      'SELECT UNI_NOMBRE as NombreUnidad FROM T_MEUNIDAD WHERE PK_TMEUNIDAD = ?',
      [CodUnidad]
    );

    // Extrae el nombre de la unidad del resultado de la consulta.
    const nombreUnidad = unidadResult[0]?.NombreUnidad ?? '';

    const nuevoServicioEspecial: ServicioEspecial = {
      CodServicioEspecial: result.insertId,
      NombreServicioEspecial,
      DescripcionServicioEspecial,
      CodUnidad,
      Estado: '1',
      NombreUnidad: nombreUnidad,
    };

    res.status(200).json({ nuevoServicioEspecial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el servicio especial' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServicioEspecial[] | ServicioEspecial | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getServiciosEspeciales(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createServicioEspecial(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}