import socket

ip = "172.16.10.130"
ports = [8000, 80, 5173, 443, 22]

for port in ports:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.5)
    result = s.connect_ex((ip, port))
    if result == 0:
        print(f"Port {port} is OPEN on {ip}")
    else:
        print(f"Port {port} is CLOSED/UNREACHABLE on {ip} (code {result})")
    s.close()
