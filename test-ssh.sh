#!/bin/bash
# Тест SSH подключения к серверу
echo "Проверяю SSH подключение к 159.203.104.235..."
ssh -o ConnectTimeout=5 root@159.203.104.235 'echo "✅ SSH подключение работает!" && hostname && date'
