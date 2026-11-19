#!/bin/sh
# Lists variable NAMES only from .env; never prints a value.
set -u
cd /root/roo-plus || exit 2
sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env | sort
