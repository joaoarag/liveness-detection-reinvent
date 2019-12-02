# import detect_mouth_webcam
import detectNose
# import detectVideo
# import Blink
import os
from PIL import Image
from io import BytesIO
import base64
from flask import Flask, request, Response
import json

# from bottle import Bottle, request, response
# from paste import httpserver

app = Flask(__name__)
# app = Bottle()

# for CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key')
    response.headers.add('Access-Control-Allow-Methods', 'POST') # Put any other methods you need here
    response.headers.add('Access-Control-Max-Age', '60')
    return response

@app.route('/')
def index():
    return Response('Tensor Flow object detection')
    # return response('Tensor Flow object detection')


# @app.route('/local')
# def local():
#     return Response(open('./static/local.html').read(), mimetype="text/html")
#     # return response(open('./static/local.html').read(), mimetype="text/html")


# @app.route('/video')
# def remote():
#     return Response(open('./static/video.html').read(), mimetype="text/html")
#     # return response(open('./static/video.html').read(), mimetype="text/html")


# @app.route('/test')
# def test():
#     PATH_TO_TEST_IMAGES_DIR = 'object_detection/test_images'  # cwh
#     TEST_IMAGE_PATHS = [os.path.join(PATH_TO_TEST_IMAGES_DIR, 'image{}.jpg'.format(i)) for i in range(1, 3)]

#     image = Image.open(TEST_IMAGE_PATHS[0])
#     objects = object_detection_api.get_objects(image)

#     return objects

# @app.post('/noseDetect')
@app.route('/nosedetect', methods=['POST', 'OPTIONS'])
def noseDetect():
    if request.method == 'OPTIONS':
        return ""
    elif request.method == 'POST':
        try:
            req = request.json

            image_file = req['image']  # get the image
            canvasWidth = req['canvasWidth']
            videoWidth = req['videoWidth']
            challenge = req['challenge']
            referenceRect = req['referenceRect']
            referenceObject = req['referenceObject']

            # finally run the image through tensor flow object detection`
            image_object = Image.open(BytesIO(base64.b64decode(image_file)))
            #objects = object_detection_api.get_objects(image_object, threshold)
            Response.content_type = 'application/json'

            objects = detectNose.get_objects(image_object, canvasWidth, videoWidth, challenge, referenceRect, referenceObject)
            return objects

        except Exception as e:
            print('POST /nosedetect error: {}'.format(e))
            return json.dumps({"Error" : '{}'.format(e)})

@app.route('/nosecenter', methods=['POST', 'OPTIONS'])
def noseCenter():
    if request.method == 'OPTIONS':
        return ""
    elif request.method == 'POST':
        try:
            req = request.json

            image_file = req['image']  # get the image
            canvasWidth = req['canvasWidth']
            videoWidth = req['videoWidth']

            # finally run the image through tensor flow object detection`
            image_object = Image.open(BytesIO(base64.b64decode(image_file)))
            #objects = object_detection_api.get_objects(image_object, threshold)
            Response.content_type = 'application/json'

            objects = detectNose.get_objects(image_object, canvasWidth, videoWidth, {}, {}, {})
            return objects

        except Exception as e:
            print('POST /nosecenter error: {}'.format(e))
            # print("videoWidth={}, canvasWidth={}".format(videoWidth, canvasWidth))
            return json.dumps({"Error" : '{}'.format(e)})

# @app.route('/detectfake', methods=['POST', 'OPTIONS'])
# def fakeDetect():
#     if request.method == 'OPTIONS':
#         return ""
#     elif request.method == 'POST':
#         try:
#             req = request.json
#             image_file = req['image']  # get the image

#             # finally run the image through tensor flow object detection`
#             image_object = Image.open(BytesIO(base64.b64decode(image_file)))
#             #objects = object_detection_api.get_objects(image_object, threshold)
#             Response.content_type = 'application/json'

#             objects = detectVideo.detect_fake(image_object)
#             return objects

#         except Exception as e:
#             print('POST /detectfake error: {}'.format(e))
#             # print("videoWidth={}, canvasWidth={}".format(videoWidth, canvasWidth))
#             return json.dumps({"Error" : '{}'.format(e)})

# @app.route('/detectblink', methods=['POST', 'OPTIONS'])
# def blinkDetect():
#     if request.method == 'OPTIONS':
#         return ""
#     elif request.method == 'POST':
#         try:
#             req = request.json
#             image_file = req['image']  # get the image

#             # finally run the image through tensor flow object detection`
#             image_object = Image.open(BytesIO(base64.b64decode(image_file)))
#             #objects = object_detection_api.get_objects(image_object, threshold)
#             Response.content_type = 'application/json'

#             objects = Blink.detect_blink(image_object, secret)
#             return objects

#         except Exception as e:
#             print('POST /detectblink error: {}'.format(e))
#             # print("videoWidth={}, canvasWidth={}".format(videoWidth, canvasWidth))
#             return json.dumps({"Error" : '{}'.format(e)})

if __name__ == '__main__':
	# without SSL
    app.run(debug=False, host='0.0.0.0')
    # httpserver.serve(app, host='0.0.0.0', port=8080)

	# with SSL
    # app.run(debug=True, host='0.0.0.0', ssl_context=('ssl/localhost.crt', 'ssl/localhost.key'))
