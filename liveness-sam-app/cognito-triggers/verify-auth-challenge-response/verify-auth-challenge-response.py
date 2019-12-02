import logging
import json
import rsa
import base64
import boto3

with open("pubkey.pem", mode='rb') as publickeyfile:
    keydata = publickeyfile.read()

pubkey = rsa.PublicKey.load_pkcs1(keydata)

def verifySecret(message, signature_b64):
    
    # with open("params.json") as p:
    #     params = json.load(p)
    # bucket_name = params["s3bucket_pubkey"]
    # object_name = params["s3key_pubkey"]
    
    # s3 = boto3.client('s3')
    # try:
    #     response = s3.get_object(Bucket=bucket_name, Key=object_name)
    # except ClientError as e:
    #     logging.error(e)
    signature = base64.decodebytes(signature_b64.encode())
    try: 
        isVerified = rsa.verify(message.encode(), signature, pubkey)
        return True
    except VerificationError as e:
        logging.info(e)
        return False

def lambda_handler(event, context):
    logging.info(event)
    try:
        expectedAnswer = event["request"]["privateChallengeParameters"]["answer"]
        providedAnswer = event["request"]["challengeAnswer"].split("##")
        if len(providedAnswer) > 1:
            # This comes from the liveness detection test and has the format "SECRET##<signedSecret>##<faceId"
            # Do RSA verification 
            if len(providedAnswer) > 2 and event["userAttributes"]["custom:faceId"] == providedAnswer[2]:
                event["response"]["answerCorrect"] = verifySecret(expectedAnswer, providedAnswer[1])
            elif len(providedAnswer) == 2:
                event["response"]["answerCorrect"] = verifySecret(expectedAnswer, providedAnswer[1])
            else:
                event["response"]["answerCorrect"] = False

        else:
            # This comes from the face recognition test and has the format "<faceId>"
            if providedAnswer[0] == expectedAnswer:
                event["response"]["answerCorrect"] = True
            else:
                event["response"]["answerCorrect"] = False
        # Return to Amazon Cognito
        logging.info(event)
        return event
    except Exception as e:
        logging.error(e)