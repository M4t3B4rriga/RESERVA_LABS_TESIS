import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { Auditoria } from '@/libs/auditoria';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetAuditoriaParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getAuditoria(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetAuditoriaParams = {}) {
  try {
    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['PK_TMSAUDITORIA', 'AUD_DESCRIPCION_ACTIV', 'AUD_RESULTADO_ACTIV', 'AUD_NAVEGADOR', 'AUD_DISPOSITIVO', 'XEUSU_CODIGO', 'ESTADO'];
    orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'PK_TMSAUDITORIA';
    const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
    const whereConditions = [];
    const filterConditions = [] as string[];
    const filterDateConditions = [] as string[];
    console.log(filter);

    if (filter) {
      const filterParams = filter.split(',');
      const allowedAttributes = ['AUD_FECHA'];
      console.log(filterParams);
      filterParams.forEach(param => {
        const [attribute, value] = param.split('--');
        console.log("aca"+value);
        if (!value) {
          console.error(`Se debe proporcionar un valor para el atributo ${attribute}`);
          return;
        }

        if (allowedAttributes.includes(attribute)) {
          if (attribute === 'AUD_FECHA') {
            const dateValues = value.split('T');
            filterDateConditions.push(dateValues[0]);
          }
        } else {
          console.error(`Atributo no válido: ${attribute}`);
        }
      });
    }
    if(filterDateConditions.length==1)
    {
      console.log("1");
      filterConditions.push(`AUD_FECHA >= '${filterDateConditions[0]}'`);
    }
    if(filterDateConditions.length==2)
    {
      console.log("2");
      filterConditions.push(`AUD_FECHA >= '${filterDateConditions[0]}' AND AUD_FECHA <= '${filterDateConditions[1]}'`);
    }
    if(filterDateConditions.length==3)
    {
      console.log("3");
      filterConditions.push(`AUD_FECHA < '${filterDateConditions[0]}'`);
    }
    if (filterConditions.length > 0) {
      whereConditions.push(`(${filterConditions.join(' OR ')})`);
    }

    if (search) {
      whereConditions.push(`AUD_DESCRIPCION_ACTIV LIKE '%${search}%'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
  SELECT
   A.PK_TMSAUDITORIA as CodAuditoria,
   A.AUD_FECHA as Fecha,
   A.AUD_HORA as Hora,
   A.AUD_IP_USUARIO as IPusuario,
   A.AUD_DESCRIPCION_ACTIV as DescripcionActividad,
   A.AUD_RESULTADO_ACTIV as ResultadoActividad,
   A.AUD_NAVEGADOR as Navegador,
   A.AUD_DISPOSITIVO as Dispositivo,
   A.ESTADO as Estado,
   U.PK_TMCPERSONA_INTERNA as IdCarnet
  FROM t_msauditoria A
  JOIN t_msusuario U ON A.XEUSU_CODIGO = U.XEUSU_CODIGO
  JOIN t_mcpersona_interna P ON U.PK_TMCPERSONA_INTERNA = P.PK_TMCPERSONA_INTERNA
  ${whereClause} AND A.AUD_IP_USUARIO != ''
  ${orderClause}
  LIMIT ${limit}
  OFFSET ${offset}
`;
    const countQuery = `SELECT COUNT(*) as count FROM t_msauditoria ${whereClause}`;

    const [result] = await pool.query(query);
    const auditoria = result as Auditoria[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ auditoria, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener la auditoria' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Auditoria[] | Auditoria | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getAuditoria(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;
  }
}