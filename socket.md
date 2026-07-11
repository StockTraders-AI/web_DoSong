Hướng dẫn kết nối Socket.IO - Realtime Core
Tài liệu này dành cho frontend web, ứng dụng mobile và backend client cần nhận dữ liệu realtime từ Realtime Core.

1. Tổng quan Realtime Core
Realtime Core là service trung gian nhận dữ liệu qua REST API, kiểm tra request và chuyển tiếp dữ liệu tới các client đã subscribe channel tương ứng qua Socket.IO.

Service không xử lý business logic, không lưu database và trong Phase 1 chưa sử dụng Redis hoặc BullMQ. Subscription hiện được lưu trong memory bằng Socket.IO rooms, vì vậy sẽ mất khi service restart và không đồng bộ giữa nhiều instance.

2. Socket.IO namespace
Namespace sử dụng cho realtime là:

/realtime
Staging: http://112.213.91.235:3005/realtime
Production: https://your-domain.com/realtime
Socket.IO không phải raw WebSocket. Client phải sử dụng thư viện Socket.IO tương thích.

3. Cách connect
Client kết nối trực tiếp tới URL có namespace /realtime. Socket.IO handshake path giữ giá trị mặc định /socket.io.

http://112.213.91.235:3005/realtime
Production phải sử dụng HTTPS/WSS khi website chạy HTTPS để tránh lỗi mixed content.

4. Cách subscribe channel
Client gửi yêu cầu subscribe qua event message:

{
  "action": "subscribe",
  "channels": ["wave", "stock-signal"]
}
Mỗi channel phải thuộc RealtimeChannel. Có thể subscribe một hoặc nhiều channel trong cùng request. Các channel trùng lặp hoặc không hợp lệ sẽ bị validation từ chối.

5. Danh sách channel hiện có
Enum	Giá trị channel
WAVE	wave
STOCK_SIGNAL	stock-signal
SMDT_BRANCH	smdt-branch
SMDT_STOCK	smdt-stock
MONEY_FLOW_BRANCH	money-flow-branch
MONEY_FLOW_STOCK	money-flow-stock
SMDT_TICKER_CROSS	smdt-ticker-cross
SMDT_BRANCH_CROSS	smdt-branch-cross
6. Payload realtime nhận từ server
Server phát dữ liệu qua event message:

{
  "channel": "wave",
  "data": {},
  "sentAt": "ISO_DATE"
}
Field	Kiểu	Ý nghĩa
channel	string	Channel đã phát dữ liệu
data	object	Dữ liệu do publisher gửi lên
sentAt	ISO 8601 string	Thời điểm Realtime Core phát message
7. Cách gọi API publish
Endpoint:

POST /realtime/publish
Content-Type: application/json
Ví dụ Staging:

curl --request POST http://112.213.91.235:3005/realtime/publish \
  --header 'Content-Type: application/json' \
  --data '{
    "channel": "wave",
    "data": {
      "symbol": "VNM",
      "value": 100
    }
  }'
channel và data là bắt buộc. channel phải thuộc RealtimeChannel và data phải là object.

Response thành công:

{
  "success": true,
  "data": {
    "channel": "wave",
    "data": {
      "symbol": "VNM",
      "value": 100
    },
    "sentAt": "2026-06-23T10:00:00.000Z"
  }
}
8. Ví dụ test bằng Postman
Kết nối Socket.IO
Chọn New → Socket.IO. Không chọn raw WebSocket.
Nhập URL ws://112.213.91.235:3005/realtime.
Chọn Client version v3; cấu hình này tương thích với server hiện tại.
Giữ Handshake path là /socket.io và nhấn Connect.
Thêm listener cho event message trong tab Events.
Gửi event message với JSON:
{
  "action": "subscribe",
  "channels": ["wave", "stock-signal"]
}
Publish dữ liệu
Tạo HTTP request mới với method POST, URL http://112.213.91.235:3005/realtime/publish, chọn Body → raw → JSON và gửi:

{
  "channel": "wave",
  "data": {
    "symbol": "VNM",
    "value": 100
  }
}
Tab Socket.IO đã subscribe sẽ nhận event message.

9. Ví dụ Web client dùng socket.io-client
Cài package:

npm install socket.io-client
Kết nối và subscribe:

import { io } from 'socket.io-client';

interface RealtimePayload {
  channel: string;
  data: Record<string, unknown>;
  sentAt: string;
}

const socket = io('http://112.213.91.235:3005/realtime', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  socket.emit('message', {
    action: 'subscribe',
    channels: ['wave', 'stock-signal'],
  });
});

socket.on('message', (payload: RealtimePayload) => {
  console.log('Realtime payload:', payload);
});

socket.on('connect_error', (error: Error) => {
  console.error('Socket.IO connection error:', error.message);
});
10. Ví dụ Flutter client dùng socket_io_client
Thêm dependency:

dependencies:
  socket_io_client: ^3.1.2
Kết nối và subscribe:

import 'package:socket_io_client/socket_io_client.dart' as io;

final socket = io.io(
  'http://112.213.91.235:3005/realtime',
  io.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .build(),
);

socket.onConnect((_) {
  socket.emit('message', {
    'action': 'subscribe',
    'channels': ['wave', 'stock-signal'],
  });
});

socket.on('message', (payload) {
  print('Realtime payload: $payload');
});

socket.onConnectError((error) {
  print('Socket.IO connection error: $error');
});

socket.connect();
Khi chạy Android Emulator, localhost trỏ tới emulator. Thông thường cần dùng 10.0.2.2:3000; iOS Simulator có thể dùng localhost, còn thiết bị thật phải dùng IP LAN hoặc domain truy cập được.

11. Các lỗi thường gặp
Kết nối raw WebSocket thay vì Socket.IO
Socket.IO có protocol riêng. Hãy chọn Socket.IO request trong Postman hoặc dùng đúng client library.

Sai namespace hoặc handshake path
Namespace là /realtime, nhưng handshake path mặc định vẫn là /socket.io. Không đổi handshake path thành /realtime.

Gửi sai event hoặc payload subscribe
Gateway lắng nghe event message. Payload phải có action: "subscribe" và channels là một mảng không rỗng, không trùng lặp.

Channel không hợp lệ
Channel phải khớp chính xác một giá trị trong bảng RealtimeChannel, bao gồm các channel sử dụng tên branch.

Không nhận message sau khi publish
Đảm bảo socket đã connect, đã subscribe đúng channel trước khi gọi API, listener đang nghe event message, và request publish dùng cùng channel.

Lỗi mixed content hoặc CORS
Trang HTTPS phải kết nối production bằng HTTPS/WSS. Kiểm tra domain, reverse proxy và cấu hình CORS khi deploy.

Mất subscription sau restart hoặc khi chạy nhiều instance
Phase 1 dùng in-memory rooms. Restart sẽ xóa subscription và nhiều instance chưa chia sẻ room state vì chưa sử dụng Redis adapter.