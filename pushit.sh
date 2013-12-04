#! /bin/bash

aws --profile ${1} s3 sync . s3://${2}/ --acl public-read --exclude '.git*' --exclude '*.DS_Store' --exclude '*~' --exclude pushit.sh --delete



