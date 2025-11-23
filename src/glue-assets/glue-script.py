# glue-script.py
import sys
import json
from awsglue import utils

args = utils.getResolvedOptions(sys.argv, ["n"])
n = int(args["n"])

def main():
    trigger_lambda = (n % 2 == 0)

    result = {"triggerLambda": trigger_lambda}

    # MUST print JSON in one line (this becomes StepFunctions output)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
