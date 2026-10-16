'use client';

import Link from 'next/link';
import { Box, Button, Container, Typography } from '@mui/material';

export default function NotFound() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h1" fontWeight={800}>
          404
        </Typography>

        <Typography variant="h5">
          ไม่พบหน้าที่คุณกำลังค้นหา
        </Typography>

        <Typography color="text.secondary">
          หน้านี้อาจถูกย้ายหรือลบไปแล้ว
        </Typography>

        <Button component={Link} href="/" variant="contained">
          กลับหน้าหลัก
        </Button>
      </Box>
    </Container>
  );
}