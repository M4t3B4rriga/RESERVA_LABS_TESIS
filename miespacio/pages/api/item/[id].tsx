import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Roles } from '@/libs/roles';
import { MenuItem } from '@/libs/MenuItem';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ menuItems: MenuItem[], subMenuItems: SubMenuItem[], subSubMenuItems: SubSubMenuItem[] } | { message: string }>) {
  const { method } = req;
  const { id } = req.query;

  switch (method) {
    case 'GET':

      break;

    case 'PUT':

      try {
        const { itemType, ItemMenu, ItemSubMenu, NombreItem, NombreSubItem, NombreSubSubItem, URLItem, URLSubItem, URLSubSubItem, IconoItem, IconoSubItem, IconoSubSubItem, CodigoItem, CodigoSubItem } = req.body;

        if (itemType === 'item') {
          try {
            const Estado = '1';
            const [result] = await pool.query<OkPacket>(
              'UPDATE t_msitem_menu SET IME_NOMBRE = ?, IME_URL = ?, IME_ICONO = ? WHERE PK_TMS_ITEM_MENU = ?',
              [NombreItem, URLItem, IconoItem, id]
            );
            if (result.affectedRows === 0) {
              res.status(404).json({ message: 'Item no encontrado' });
              return;
            }
            const [row] = await pool.query<any[]>('SELECT * FROM t_msitem_menu WHERE PK_TMS_ITEM_MENU = ?', [id]);
            console.log(row[0]);
            const Item: MenuItem = {
              PK_TMS_ITEM_MENU: row[0].PK_TMS_ITEM_MENU,
              IME_NOMBRE: NombreItem,
              IME_URL: URLItem,
              IME_POSICION: row[0].IME_POSICION,
              IME_ICONO: IconoItem,
              ESTADO: row[0].ESTADO,
            };
            res.status(201).json({ menuItems: [Item], subMenuItems: [], subSubMenuItems: [] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el item' });
          }


        } else if (itemType === 'subitem') {

          try {
            const Estado = '1';
            const [result] = await pool.query<OkPacket>(
              'UPDATE t_mssubitem_menu SET SME_NOMBRE = ?, SME_URL = ?, SME_ICON = ? WHERE PK_TMSSUBITEM_MENU = ?',
              [NombreSubItem, URLSubItem, IconoSubItem, id]
            );
            if (result.affectedRows === 0) {
              res.status(404).json({ message: 'Item no encontrado' });
              return;
            }
            const [row] = await pool.query<any[]>('SELECT * FROM t_mssubitem_menu WHERE PK_TMSSUBITEM_MENU = ?', [id]);
            console.log(row[0]);
            const SubItem: SubMenuItem = {
              PK_TMSSUBITEM_MENU: row[0].PK_TMSSUBITEM_MENU,
              PK_TMS_ITEM_MENU: row[0].PK_TMS_ITEM_MENU,
              SME_NOMBRE: NombreSubItem,
              SME_URL: URLSubItem,
              SME_POSICION: row[0].SME_POSICION,
              SME_ICON: IconoSubItem,
              ESTADO: row[0].ESTADO,
            };
            res.status(201).json({ menuItems: [], subMenuItems: [SubItem], subSubMenuItems: [] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Subitem' });
          }


        } else if (itemType === 'subsubitem') {

          try {
            const Estado = '1';
            const [result] = await pool.query<OkPacket>(
              'UPDATE t_mssub_subitem_menu SET SSM_NOMBRE = ?, SSM_URL = ? WHERE PK_TMSSUB_SUBITEM_MENU = ?',
              [NombreSubSubItem, URLSubSubItem, id]
            );
            if (result.affectedRows === 0) {
              res.status(404).json({ message: 'Item no encontrado' });
              return;
            }
            const [row] = await pool.query<any[]>('SELECT * FROM t_mssub_subitem_menu WHERE PK_TMSSUB_SUBITEM_MENU = ?', [id]);
            console.log(row[0]);
            const SubSubItem: SubSubMenuItem = {
              PK_TMSSUB_SUBITEM_MENU: row[0].PK_TMSSUB_SUBITEM_MENU,
              PK_TMSSUBITEM_MENU: row[0].PK_TMSSUBITEM_MENU,
              SSM_NOMBRE: NombreSubSubItem,
              SSM_URL: URLSubSubItem,
              SSM_POSICION: row[0].SSM_POSICION,
              ESTADO: row[0].ESTADO,
            };
            res.status(201).json({ menuItems: [], subMenuItems: [], subSubMenuItems: [SubSubItem] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Sub Subitem' });
          }

        } else {
          res.status(400).json({ message: 'Tipo de elemento no válido' });
        }
      } catch (error) {
        console.error('Error al crear un nuevo elemento:', error);
        res.status(500).json({ message: 'Error al crear un nuevo elemento' });
      }
      break;

    case 'DELETE':

      try {
        const { itemType, ItemMenu, ItemSubMenu, NombreItem, NombreSubItem, NombreSubSubItem, URLItem, URLSubItem, URLSubSubItem, IconoItem, IconoSubItem, IconoSubSubItem, CodigoItem, CodigoSubItem } = req.body;

        if (itemType === 'item') {
          try {
            const Estado = '0';
            const [result] = await pool.query<OkPacket>(
              'UPDATE t_msitem_menu SET ESTADO = ? WHERE PK_TMS_ITEM_MENU = ?',
              [Estado, id]
            );
            if (result.affectedRows === 0) {
              res.status(404).json({ message: 'Item no encontrado' });
              return;
            }
            const [row] = await pool.query<any[]>('SELECT * FROM t_msitem_menu WHERE PK_TMS_ITEM_MENU = ?', [id]);
            console.log(row[0]);
            const Item: MenuItem = {
              PK_TMS_ITEM_MENU: row[0].PK_TMS_ITEM_MENU,
              IME_NOMBRE: row[0].IME_NOMBRE,
              IME_URL: row[0].IME_URL,
              IME_POSICION: row[0].IME_POSICION,
              IME_ICONO: row[0].IME_ICONO,
              ESTADO: row[0].ESTADO,
            };
            res.status(201).json({ menuItems: [Item], subMenuItems: [], subSubMenuItems: [] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el item' });
          }


        } else if (itemType === 'subitem') {

          try {
            const Estado = '0';
            const [result] = await pool.query<OkPacket>(
              'UPDATE t_mssubitem_menu SET ESTADO = ? WHERE PK_TMSSUBITEM_MENU = ?',
              [Estado, id]
            );
            if (result.affectedRows === 0) {
              res.status(404).json({ message: 'Item no encontrado' });
              return;
            }
            const [row] = await pool.query<any[]>('SELECT * FROM t_mssubitem_menu WHERE PK_TMSSUBITEM_MENU = ?', [id]);
            console.log(row[0]);
            const SubItem: SubMenuItem = {
              PK_TMSSUBITEM_MENU: row[0].PK_TMSSUBITEM_MENU,
              PK_TMS_ITEM_MENU: row[0].PK_TMS_ITEM_MENU,
              SME_NOMBRE: row[0].SME_NOMBRE,
              SME_URL: row[0].SME_URL,
              SME_POSICION: row[0].SME_POSICION,
              SME_ICON: row[0].SME_ICON,
              ESTADO: row[0].ESTADO,
            };
            res.status(201).json({ menuItems: [], subMenuItems: [SubItem], subSubMenuItems: [] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Subitem' });
          }


        } else if (itemType === 'subsubitem') {

          try {
            const Estado = '0';
            const [result] = await pool.query<OkPacket>(
              'UPDATE t_mssub_subitem_menu SET ESTADO = ? WHERE PK_TMSSUB_SUBITEM_MENU = ?',
              [Estado, id]
            );
            if (result.affectedRows === 0) {
              res.status(404).json({ message: 'Item no encontrado' });
              return;
            }
            const [row] = await pool.query<any[]>('SELECT * FROM t_mssub_subitem_menu WHERE PK_TMSSUB_SUBITEM_MENU = ?', [id]);
            console.log(row[0]);
            const SubSubItem: SubSubMenuItem = {
              PK_TMSSUB_SUBITEM_MENU: row[0].PK_TMSSUB_SUBITEM_MENU,
              PK_TMSSUBITEM_MENU: row[0].PK_TMSSUBITEM_MENU,
              SSM_NOMBRE: row[0].SSM_NOMBRE,
              SSM_URL: row[0].SSM_URL,
              SSM_POSICION: row[0].SSM_POSICION,
              ESTADO: row[0].ESTADO,
            };
            res.status(201).json({ menuItems: [], subMenuItems: [], subSubMenuItems: [SubSubItem] });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Sub Subitem' });
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
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}