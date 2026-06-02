import dotenv from 'dotenv';
import pkg from 'xlsx';
const { readFile, utils } = pkg;
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

global.WebSocket = ws;
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

const filename = 'LAPORAN KEUANGAN FOKUS KESINI.xlsx';

const pad = (n) => n.toString().padStart(2, '0');

const parseDate = (d) => {
  if (d instanceof Date) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  } else if (typeof d === 'string') {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    }
  }
  return null;
}

const run = async () => {
  try {
    const workbook = readFile(filename, { cellDates: true });
    console.log('Sheet Names:', workbook.SheetNames);
    
    let totalInserted = 0;

    for (const sheetName of workbook.SheetNames) {
      console.log(`Processing sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const rows = utils.sheet_to_json(worksheet, { header: 1 });
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Cek Nama Acara (Kolom 0)
        const clientName = row[0];
        if (!clientName || clientName === '-' || String(clientName).trim() === '') continue;

        // Tanggal Acara (Kolom 1)
        const eventDateStr = parseDate(row[1]);
        if (!eventDateStr) {
          console.warn(`Baris dilewati karena tanggal tidak valid. Nama: ${clientName}`);
          continue;
        }

        // Data Order
        const serviceType = String(clientName).split(' ')[0] || 'Lainnya';
        const uangMasuk = Number(row[2]) || 0;
        const pengeluaran = Number(row[3]) || 0;
        const keterangan = row[4] ? String(row[4]) : '';
        const keuntungan = Number(row[5]) || 0;
        
        const isPemodal = String(row[7] || '').trim().toLowerCase() === 'dibayarkan';
        const isAlat = String(row[9] || '').trim().toLowerCase() === 'dibayarkan';
        const isPekerja = String(row[12] || '').trim().toLowerCase() === 'dibayarkan'; 
        const isMitra = isPekerja; 

        const linkDrive = row[13] || null;
        const limitFoto = row[14] && !isNaN(Number(row[14])) ? Number(row[14]) : null;
        const linkSeleksi = row[15] || null;

        // 1. Insert ke tabel orders
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            client_name: clientName,
            service_type: serviceType,
            event_date: eventDateStr,
            status: 'done',
            payment_status: 'lunas',
            drive_link: linkDrive,
            max_selections: limitFoto,
            client_selection_link: linkSeleksi
          })
          .select()
          .single();

        if (orderError) {
          console.error(`Gagal insert order ${clientName}:`, orderError.message);
          continue;
        }

        // 2. Insert ke tabel finances
        let expensesList = [];
        if (keterangan && keterangan !== '-' && pengeluaran > 0) {
          expensesList.push({ name: keterangan, amount: pengeluaran });
        }

        const { error: financeError } = await supabase
          .from('finances')
          .insert({
            order_id: order.id,
            total_gross: uangMasuk,
            expenses: pengeluaran,
            expenses_list: expensesList,
            net_profit: keuntungan,
            is_paid_pemodal: isPemodal,
            is_paid_alat: isAlat,
            is_paid_mitra: isMitra,
            is_paid_pekerja: isPekerja
          });

        if (financeError) {
          console.error(`Gagal insert finances ${clientName}:`, financeError.message);
        } else {
          totalInserted++;
          console.log(`✓ Inserted: ${clientName} (${eventDateStr}) -> Profit: ${keuntungan}`);
        }
      }
    }
    console.log(`\nSELESAI! Berhasil mengimpor ${totalInserted} baris data ke database!`);
  } catch (err) {
    console.error('Terjadi kesalahan:', err);
  }
}

run();
