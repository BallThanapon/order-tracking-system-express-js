import ThemeRegistry from './ThemeRegistry';

export const metadata = {
  title: 'Order Tracking',
  description: 'ระบบติดตามออเดอร์และสถานะ Bot',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
