import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { RowDataPacket } from 'mysql2';
import { MenuItem } from '@/libs/MenuItem';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';
import { OkPacket } from 'mysql2';
export default async function handler(req: NextApiRequest, res: NextApiResponse<{ menuItems: MenuItem[], subMenuItems: SubMenuItem[], subSubMenuItems: SubSubMenuItem[] } | { message: string }>) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const menuItemsQuery = `SELECT * FROM t_msitem_menu WHERE ESTADO = 1 ORDER BY IME_POSICION`;
        const subMenuItemsQuery = 'SELECT * FROM t_mssubitem_menu WHERE ESTADO = 1 ORDER BY SME_POSICION';
        const subSubMenuItemsQuery = 'SELECT * FROM t_mssub_subitem_menu WHERE ESTADO = 1 ORDER BY SSM_POSICION';

        const [menuItemsResult] = await pool.execute<RowDataPacket[]>(menuItemsQuery);
        const [subMenuItemsResult] = await pool.execute<RowDataPacket[]>(subMenuItemsQuery);
        const [subSubMenuItemsResult] = await pool.execute<RowDataPacket[]>(subSubMenuItemsQuery);

        const menuItems: MenuItem[] = menuItemsResult as MenuItem[];
        const subMenuItems: SubMenuItem[] = subMenuItemsResult as SubMenuItem[];
        const subSubMenuItems: SubSubMenuItem[] = subSubMenuItemsResult as SubSubMenuItem[];

        const response = {
          menuItems,
          subMenuItems,
          subSubMenuItems
        };

        res.status(200).json(response);
      } catch (error) {
        console.error('Error al obtener los datos del menú:', error);
        res.status(500).json({ message: 'Error al obtener los datos del menú' });
      }
      break;

    case 'POST':
      try {
        const { itemType, ItemMenu, ItemSubMenu, NombreItem, NombreSubItem, NombreSubSubItem, URLItem, URLSubItem, URLSubSubItem, IconoItem, IconoSubItem, IconoSubSubItem } = req.body;

        if (itemType === 'item') {
          try {
            const Estado = '1';
            var nuevaPosicion;
            const [rows] = await pool.query<RowDataPacket[]>(
              'SELECT IME_POSICION FROM t_msitem_menu ORDER BY IME_POSICION DESC LIMIT 1;'
            );
            
            if (rows.length > 0) {
              const PosicionSQL = rows[0].IME_POSICION; // Obtener el valor de posición actual
            
              nuevaPosicion = PosicionSQL + 1; // Sumar uno al valor de posición actual
            
              // Luego puedes utilizar la variable 'nuevaPosicion' en tu lógica o consulta INSERT
            } else {

              nuevaPosicion = 1;
            }
            const [result] = await pool.query<OkPacket>(
              'INSERT INTO t_msitem_menu (IME_NOMBRE, IME_URL, IME_POSICION, IME_ICONO, ESTADO) VALUES (?, ?, ?, ?, ?)',
              [NombreItem, URLItem, nuevaPosicion, IconoItem, Estado]
            );
            const nuevoItem: MenuItem = {
              PK_TMS_ITEM_MENU: result.insertId,
              IME_NOMBRE:NombreItem,
              IME_URL:URLItem,
              IME_POSICION:nuevaPosicion,
              IME_ICONO:IconoItem,
              ESTADO: Estado,
            };
            res.status(201).json({ menuItems: [nuevoItem], subMenuItems: [], subSubMenuItems: [] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el item' });
          }

          
        } else if (itemType === 'subitem') {
          
          try {
            const Estado = '1';
            var nuevaPosicion;
            const [rows] = await pool.query<RowDataPacket[]>(
              'SELECT SME_POSICION FROM t_mssubitem_menu ORDER BY SME_POSICION DESC LIMIT 1;'
            );
            
            if (rows.length > 0) {
              const PosicionSQL = rows[0].SME_POSICION; // Obtener el valor de posición actual
            
              nuevaPosicion = PosicionSQL + 1; // Sumar uno al valor de posición actual
            
              // Luego puedes utilizar la variable 'nuevaPosicion' en tu lógica o consulta INSERT
            } else {

              nuevaPosicion = 1;
            }
            const [result] = await pool.query<OkPacket>(
              'INSERT INTO t_mssubitem_menu (PK_TMS_ITEM_MENU, SME_NOMBRE, SME_URL, SME_POSICION, SME_ICON, ESTADO) VALUES (?, ?, ?, ?, ?, ?)',
              [ItemMenu, NombreSubItem, URLSubItem, nuevaPosicion, IconoSubItem, Estado]
            );
            const nuevoSubItem: SubMenuItem = {
              PK_TMSSUBITEM_MENU: result.insertId,
              PK_TMS_ITEM_MENU: ItemMenu,
              SME_NOMBRE:NombreSubItem,
              SME_URL:URLSubItem,
              SME_POSICION:nuevaPosicion,
              SME_ICON:IconoSubItem,
              ESTADO: Estado,
            };
            res.status(201).json({ menuItems: [], subMenuItems: [nuevoSubItem], subSubMenuItems: [] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Sub item' });
          }

          
        } else if (itemType === 'subsubitem') {
          
          try {
            const Estado = '1';
            var nuevaPosicion;
            const [rows] = await pool.query<RowDataPacket[]>(
              'SELECT SSM_POSICION FROM t_mssub_subitem_menu ORDER BY SSM_POSICION DESC LIMIT 1;'
            );
            
            if (rows.length > 0) {
              const PosicionSQL = rows[0].SSM_POSICION; // Obtener el valor de posición actual
            
              nuevaPosicion = PosicionSQL + 1; // Sumar uno al valor de posición actual
            
              // Luego puedes utilizar la variable 'nuevaPosicion' en tu lógica o consulta INSERT
            } else {

              nuevaPosicion = 1;
            }
            const [result] = await pool.query<OkPacket>(
              'INSERT INTO t_mssub_subitem_menu (PK_TMSSUBITEM_MENU, SSM_NOMBRE, SSM_URL, SSM_POSICION, ESTADO) VALUES (?, ?, ?, ?, ?)',
              [ItemSubMenu, NombreSubSubItem, URLSubSubItem, nuevaPosicion, Estado]
            );
            const nuevoSubSubItem: SubSubMenuItem = {
              PK_TMSSUB_SUBITEM_MENU: result.insertId,
              PK_TMSSUBITEM_MENU: ItemSubMenu,
              SSM_NOMBRE:NombreSubSubItem,
              SSM_URL:URLSubSubItem,
              SSM_POSICION:nuevaPosicion,
              ESTADO: Estado,
            };
            res.status(201).json({ menuItems: [], subMenuItems: [], subSubMenuItems: [nuevoSubSubItem] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Sub item' });
          }

        } else {
          res.status(400).json({ message: 'Tipo de elemento no válido' });
        }
      } catch (error) {
        console.error('Error al crear un nuevo elemento:', error);
        res.status(500).json({ message: 'Error al crear un nuevo elemento' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}
