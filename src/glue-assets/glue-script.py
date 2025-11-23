# glue-script.py
import sys
import json
from awsglue import utils

args = utils.getResolvedOptions(sys.argv, ["n"])
n = int(args["n"])

def main():
    print("hey glue ran ",n)

if __name__ == "__main__":
    main()
