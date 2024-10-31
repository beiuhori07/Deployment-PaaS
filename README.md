# DevOps Platform with Blockchain Integration

This project implements a DevOps Platform as a Service designed to securely launch and publicly expose web applications on the internet,
with robust monitoring capabilities for log and performance metrics collection. The deployment process ensures security by verifying
the integrity of each application's dependencies using Blockchain technology.

# Features
- automatic and autonomous deployments in VMs or Containers inside your own infrastructure
- VMs are created and configured dynamically from scratch for each deployment through IaC 
- the websites are exposed publicly on the internet
- entirely dynamic communication in the distributed system
- based on microservices for supporting horizontal scaling and load balancing
- includes integrity checks based on blockchain technology against "supply chain attacks" within app dependencies
- support for edge computing based on geographical location
- logs alerts and platform performance metrics on blockchain smart contracts for transparency and trust

# Tech Stack
- Microservices: node.js
- Infrastructure as Code(IaC): Vagrant
- Hypervisor: VirtualBox
- OS: Linux
- Containerization: Docker
- Service Discovery/Registry: Consul
- Monitoring and alerting: Datadog
- Blockchain: Ethereum(Sepolia)
- Shell scripting
- Networking configs used: DHCP, SSH, DNS, Network adapters
- UI: No UI at the moment, just using Terminals, Github Checkruns, Datadog and Consul graphical interfaces for managing and monitoring the platform

# Platform Architecture
![image](https://github.com/user-attachments/assets/c25f849e-9190-4830-958b-26b83a45af95)

# Service Manager Component
The central point of the platform that manages all requests and interactions

![image](https://github.com/user-attachments/assets/1fba38f6-f6be-4790-8801-e58585562faa)

# Deployment Service Component
The component within each infrastructure server that handles deployment requests and configures VMs/Containers dynamicallyy

![image](https://github.com/user-attachments/assets/5bece9c2-96b3-4e9b-8dc0-c54695bfc5bf)

# Components of a server within the infrastructure
Each infrastructure server has all these components set up and configured after running the ./server_starting_script/Vagrantfile script, through IaC

![image](https://github.com/user-attachments/assets/08861670-dc1f-4f49-b1c6-1b829daa2afe)

# Service Registry interaction
Consul handling the dynamic communication and load balancing inside the distributed system

![image](https://github.com/user-attachments/assets/b33f1dfa-3cdd-43f0-a2b0-ae578f56045d)

# Monitoring and alerting interaction
All logs, alerts and performance metrics can be seen individually or aggregated on Datadog

![image](https://github.com/user-attachments/assets/402d6087-926a-407d-80b7-4e164283f8c7)

# DB interactions
Saving metrics for building an AI-powered Load Balancer that chooses the best available server after learning the given apps' behavior, traffic and needs.

![image](https://github.com/user-attachments/assets/ba4c800a-54a2-417c-8294-fe748ba68543)

# Sequence diagram for deployment process
![image](https://github.com/user-attachments/assets/b4978209-1805-4310-a05f-af8d3997aacd)



