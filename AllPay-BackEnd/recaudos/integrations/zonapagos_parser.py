from typing import List, Dict

def parse_str_res_pago(s: str) -> List[Dict]:
    """Parsea la respuesta de pagos de ZonaPagos"""
    if not s:
        return []
    out = []
    # Cada pago separado por ';'
    for raw in s.split(';'):
        cols = [c.strip() for c in raw.split('|')]
        if not cols or cols[0] == '':
            continue
        # Orden común en ejemplos oficiales:
        base = {
            "int_ped_numero": cols[0] if len(cols) > 0 else None,
            "int_n_pago": cols[1] if len(cols) > 1 else None,
            "int_pago_parcial": cols[2] if len(cols) > 2 else None,
            "int_pago_terminado": cols[3] if len(cols) > 3 else None,
            "int_estado_pago": cols[4] if len(cols) > 4 else None,
            "dbl_valor_pagado": cols[5] if len(cols) > 5 else None,
            "dbl_total_pago": cols[6] if len(cols) > 6 else None,
            "dbl_valor_iva_pagado": cols[7] if len(cols) > 7 else None,
            "str_descripcion": cols[8] if len(cols) > 8 else None,
            "str_id_cliente": cols[9] if len(cols) > 9 else None,
            "str_nombre": cols[10] if len(cols) > 10 else None,
            "str_apellido": cols[11] if len(cols) > 11 else None,
            "str_telefono": cols[12] if len(cols) > 12 else None,
            "str_email": cols[13] if len(cols) > 13 else None,
            "str_campo1": cols[14] if len(cols) > 14 else None,
            "str_campo2": cols[15] if len(cols) > 15 else None,
            "str_campo3": cols[16] if len(cols) > 16 else None,
            "str_campo4": cols[17] if len(cols) > 17 else None,
            "str_campo5": cols[18] if len(cols) > 18 else None,
            "dat_fecha": cols[19] if len(cols) > 19 else None,
            "int_id_forma_pago": cols[20] if len(cols) > 20 else None,
            "extras": cols[21:] if len(cols) > 21 else []
        }
        out.append(base)
    return out 