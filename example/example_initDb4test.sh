#!/bin/bash

database="test_generic_exchange";
host="localhost";
port=3306;
user="root";
password="mysql";

read -p "A database with dummy data named '${database}' is being dropped and recreated for test use. Are you sure? (y/N):" yn;

case "$yn" in 
	[yY]*) ;;
	*) echo "aborted."; exit ;;
esac

node cli/initDb.js \
 --database=$database \
 --host=$host \
 --port=$port \
 --user=$user \
 --password=$password \
 --debug \
 --insert-dummydata \
 --force-recreate
