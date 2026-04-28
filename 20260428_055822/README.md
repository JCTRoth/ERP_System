# ERP System Log Collection

Generated: Di 28. Apr 05:58:30 CEST 2026
Log Directory: 20260428_055822

## Services Logged

- **accounting-service**: 13489 lines (accounting-service.log)
- **company-service**: 4851 lines (company-service.log)
- **frontend**: 13 lines (frontend.log)
- **gateway**: 938 lines (gateway.log)
- **masterdata-service**: 16957 lines (masterdata-service.log)
- **minio**: 10 lines (minio.log)
- **notification-service**: 837 lines (notification-service.log)
- **orders-service**: 15230 lines (orders-service.log)
- **postgres**: 199 lines (postgres.log)
- **shop-service**: 67139 lines (shop-service.log)
- **templates-service**: 15 lines (templates-service.log)
- **translation-service**: 55 lines (translation-service.log)
- **user-service**: 18299 lines (user-service.log)

## Files

- insgesamt 11348
- drwxrwxr-x  2 jonas jonas    4096 Apr 28 05:58 .
- drwxrwxr-x 18 jonas jonas    4096 Apr 28 05:58 ..
- -rw-rw-r--  1 jonas jonas 1327474 Apr 28 05:58 accounting-service.log
- -rw-rw-r--  1 jonas jonas  277574 Apr 28 05:58 company-service.log
- -rw-rw-r--  1 jonas jonas    1912 Apr 28 05:58 container_stats.txt
- -rw-rw-r--  1 jonas jonas     671 Apr 28 05:58 frontend.log
- -rw-rw-r--  1 jonas jonas   66724 Apr 28 05:58 gateway.log
- -rw-rw-r--  1 jonas jonas 1623245 Apr 28 05:58 masterdata-service.log
- -rw-rw-r--  1 jonas jonas     604 Apr 28 05:58 minio.log
- -rw-rw-r--  1 jonas jonas  133162 Apr 28 05:58 notification-service.log
- -rw-rw-r--  1 jonas jonas 1377765 Apr 28 05:58 orders-service.log
- -rw-rw-r--  1 jonas jonas   25181 Apr 28 05:58 postgres.log
- -rw-rw-r--  1 jonas jonas     811 Apr 28 05:58 README.md
- -rw-rw-r--  1 jonas jonas 5083284 Apr 28 05:58 shop-service.log
- -rw-rw-r--  1 jonas jonas   14343 Apr 28 05:58 system_info.txt
- -rw-rw-r--  1 jonas jonas     915 Apr 28 05:58 templates-service.log
- -rw-rw-r--  1 jonas jonas   10229 Apr 28 05:58 translation-service.log
- -rw-rw-r--  1 jonas jonas 1623695 Apr 28 05:58 user-service.log

## How to Analyze

1. Check system_info.txt for environment details
2. Check container_stats.txt for resource usage
3. Review individual service logs for errors
4. Look for ERROR, WARN, or EXCEPTION in log files

## Common Issues

- Port conflicts: Check for 'port already in use' errors
- Database connection: Look for connection refused errors
- GraphQL federation: Check gateway logs for introspection failures
- Health checks: Verify all services report healthy status
