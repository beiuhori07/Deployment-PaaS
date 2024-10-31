data_dir = "/var/lib/consul"
client_addr = "0.0.0.0"
bind_addr = "{{ GetInterfaceIP \"wlo1\" }}"
server=false
enable_local_script_checks=true
retry_join = ["192.168.0.165"]
