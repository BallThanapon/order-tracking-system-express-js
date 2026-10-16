'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
  TextField,
  Alert,
} from '@mui/material';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const colors = {
  PENDING_PAYMENT: 'warning',
  QUEUED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  DELAYED: 'warning',
  FAILED: 'error',
  EXPIRED: 'default',
  REFUNDED: 'secondary',
};

export default function Page() {
  const [data, setData] = useState({ data: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('current');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/orders?tab=${tab}&page=1&limit=50`);
      if (!response.ok) {
        throw new Error(`API request failed (${response.status})`);
      }
      const result = await response.json();
      setData({ data: Array.isArray(result.data) ? result.data : [] });
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลออเดอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ API แล้วลองใหม่');
      setData({ data: [] });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const query = q.trim().toLowerCase();
  const rows = data.data.filter((order) => {
    const orderNo = String(order.orderNo || '').toLowerCase();
    const customerName = String(order.customerName || '').toLowerCase();
    return orderNo.includes(query) || customerName.includes(query);
  });

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        gap={2}
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Order Tracking
          </Typography>
          <Typography color="text.secondary">
            ระบบติดตามออเดอร์และสถานะ Bot
          </Typography>
        </Box>
        <Button variant="contained" onClick={load} disabled={loading}>
          {loading ? 'กำลังโหลด...' : 'Refresh'}
        </Button>
      </Stack>

      <Grid container spacing={2} mb={3}>
        {[
          ['Current', 'current'],
          ['History', 'history'],
        ].map(([label, value]) => (
          <Grid key={value} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              onClick={() => setTab(value)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setTab(value);
              }}
              sx={{
                cursor: 'pointer',
                height: '100%',
                border: tab === value ? '2px solid #2563eb' : '1px solid #eee',
                transition: 'border-color .2s, transform .2s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <CardContent>
                <Typography variant="overline">{label}</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {value === 'current' ? 'Active Orders' : 'Completed / Failed'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TextField
        fullWidth
        placeholder="ค้นหา Order No. หรือชื่อลูกค้า"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={load}>ลองอีกครั้ง</Button>
        }>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Order No.</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Game</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      {error ? 'ไม่สามารถแสดงข้อมูลได้' : 'ไม่พบข้อมูลออเดอร์'}
                    </TableCell>
                  </TableRow>
                ) : rows.map((order) => (
                  <TableRow key={order.id || order.orderNo} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{order.orderNo || '-'}</TableCell>
                    <TableCell>{order.customerName || '-'}</TableCell>
                    <TableCell>{order.game || '-'}</TableCell>
                    <TableCell>{Number(order.amount || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status || 'UNKNOWN'}
                        color={colors[order.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('th-TH') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
