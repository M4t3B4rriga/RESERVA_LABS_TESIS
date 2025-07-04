import { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server';
import { Request } from 'express';
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket, RowDataPacket } from 'mysql2';
import { Equipo } from '@/libs/equipo';
import { Espacio } from '@/libs/espacios';
import { TipoEquipo } from '@/libs/tipoEquipo';
import { insertAuditLog } from '@/src/components/Auditoria';
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

async function getEquipos(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetServicioEspecialParams = {}) {
  try {
    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = [
      'PK_TMEEQUIPO',
      'EQU_NOMBRE',
      'EQU_CANTIDAD',
      'EQU_ESTA_INSTALADO',
      'EQU_MARCA',
      'EQU_MODELO',
      'PK_TMEESPACIO',
      'ESP_NOMBRE',
      'PK_TMETIPO_EQUIPO',
      'TEQ_NOMBRE',
      'ESTADO'
    ];
    orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'PK_TMEEQUIPO';
    const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
    const filterConditions: { [key: string]: string[] } = {};

    if (filter) {
      // Separar los filtros.
      const filterParams = filter ? filter.split(',') : [];
      const allowedAttributes: { [key: string]: string } = {
        ESTADO: 'EQ.ESTADO',
        CodEspacio: 'EQ.PK_TMEESPACIO',
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
      filterGroups.push(`EQU_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = filterGroups.length > 0 ? `WHERE ${filterGroups.join(' AND ')} ` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
      SELECT EQ.PK_TMEEQUIPO as CodEquipo, EQ.EQU_NOMBRE as NombreEquipo, EQ.EQU_CANTIDAD as Cantidad, 
            EQ.EQU_ESTA_INSTALADO as EstaInstalado, EQ.EQU_MARCA as Marca, EQ.EQU_MODELO as Modelo, 
            EQ.PK_TMEESPACIO as CodEspacio, ES.ESP_NOMBRE as NombreEspacio, 
            EQ.PK_TMETIPO_EQUIPO as CodTipoEquipo, TE.TEQ_NOMBRE as NombreTipoEquipo, 
            EQ.ESTADO as Estado
      FROM T_MEEQUIPO EQ
      INNER JOIN T_MEESPACIO ES ON EQ.PK_TMEESPACIO = ES.PK_TMEESPACIO
      INNER JOIN T_METIPO_EQUIPO TE ON EQ.PK_TMETIPO_EQUIPO = TE.PK_TMETIPO_EQUIPO
      ${whereClause}
      ${orderClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countQuery = `SELECT COUNT(*) as count FROM T_MEEQUIPO EQ ${whereClause}`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const equipos = result as Equipo[];
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;
    /* aca consulta de tipos de equipo*/

    res.status(200).json({ equipos, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los equipos' });
  }
}

async function createEquipo(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreEquipo, Cantidad, EstaInstalado, Marca, Modelo, CodTipoEquipo, CodEspacio } = req.body;
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_MEEQUIPO (EQU_NOMBRE, EQU_CANTIDAD, EQU_ESTA_INSTALADO, EQU_MARCA, EQU_MODELO, PK_TMETIPO_EQUIPO, PK_TMEESPACIO, ESTADO) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [NombreEquipo, Cantidad, EstaInstalado, Marca, Modelo, CodTipoEquipo, CodEspacio]
    );

    // Consulta la tabla UNIDAD para obtener el nombre de la unidad correspondiente al código de unidad que acabas de insertar.
    const [espacioResult] = await pool.query<RowDataPacket[]>(
      'SELECT ESP_NOMBRE as NombreEspacio FROM T_MEESPACIO WHERE PK_TMEESPACIO = ?',
      [CodEspacio]
    );
    const [tipoEquipoResult] = await pool.query<RowDataPacket[]>(
      'SELECT TEQ_NOMBRE as NombreTipoEquipo FROM T_METIPO_EQUIPO WHERE PK_TMETIPO_EQUIPO = ?',
      [CodTipoEquipo]
    );
    // Extrae el nombre de la unidad del resultado de la consulta.
    const nombreEspacio = espacioResult[0]?.NombreEspacio ?? '';
    const nombreTipoEquipo = tipoEquipoResult[0]?.NombreTipoEquipo ?? '';

    const nuevoEquipo: Equipo = {
      CodEquipo: result.insertId,
      NombreEquipo,
      Cantidad,
      EstaInstalado,
      Marca,
      Modelo,
      Estado: '1',
      CodEspacio,
      NombreEspacio: nombreEspacio,
      CodTipoEquipo,
      NombreTipoEquipo: nombreTipoEquipo,
    };

    res.status(200).json({ nuevoEquipo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el equipo' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Equipo[] | Equipo | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getEquipos(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createEquipo(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}