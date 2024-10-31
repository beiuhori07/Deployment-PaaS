#!/bin/bash

if systemctl is-active --quiet datadog-agent; then
	echo "datadog agent is running"
	exit 0
else
	echo "datadog agent is not running"
	exit 2
fi
