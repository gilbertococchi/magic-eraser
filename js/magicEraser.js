/**
 * @fileoverview Mini JS Library to dynamically erase images background.
 * @author gilberto.cocchi@gmail.com (Gilberto Cocchi)
 */

/**
 * Color class, used to define a object with red/green/blue property (values 0-255).
 * @constructor
 */
function Color(red, green, blue) {
  this.red = red;
  this.green = green;
  this.blue = blue;
}


/**
 * Queue class, FIFO, with customized size.
 * @constructor
 */
var Queue = function Queue() {};

Queue.prototype = new Array;
Queue.prototype.size = 5;

/**
 * last function used to return the last element of the array.
 * @private
 */
Queue.prototype.last = function() {
    return this[this.length-1];
};

/**
 * push function used to add a base64 string representation of the image to the array.
 * @return {boolean} the status of the operation, if failed it notifies the queue is full and the first element is out.
 * @private
 */
Queue.prototype.push = function (data) {
    Array.prototype.push.apply(this,arguments);
    // If Queue exceeds the set size, remove the first element in the queue
    if(this.length > this.size) {
        this.shift();
        return true;
    }
    return false;
};


/**
 * MagicEraser class, used within a Canvas Element and a valid Image URL.
 * Once set it's possible to clear image areas with a similar effect of the PhotoShop Magic Eraser.
 * @constructor
 */
function MagicEraser(canvasElement, imageSrc) {

	var that = this,
        _canvasContext,
		_imageElement = new Image(),
        imageWidth,
        imageHeight;

    _canvasContext = canvasElement.getContext("2d");
    _imageElement.src = imageSrc;

    // When the image will be loaded define the canvas size and draw the image.
	_imageElement.onload = function() {

        imageWidth = canvasElement.width = _imageElement.width;
        imageHeight = canvasElement.height = _imageElement.height;

        _canvasContext.drawImage(_imageElement, 0, 0);

        that.history.push(canvasElement.toDataURL());

        // Bind click event on image to detect where to start the BFS visit
        canvasElement.addEventListener("click" ,function(event) {
            var index = ( event.layerY * 4 ) * canvasElement.width + ( event.layerX * 4 );
            BreadthFirstSearch(index);
        }, false);
	};

    /**
     * Breadth First Search, used to.
     * @param {number} index, image position where to start the breadth first search.
     */
    function BreadthFirstSearch(index) {

        that.renderImage(that.history.last());

        var queue = [],
            visitControl = [],
            iterationCount = 1,
            start = new Date().getTime(),
            imageData = _canvasContext.getImageData(0, 0, imageWidth, imageHeight),
            imageMatrix = imageData.data,
            visitIndex,
            leftIndex,
            rightIndex,
            topIndex,
            bottomIndex,
            firstColor = new Color(imageMatrix[index], imageMatrix[index+1], imageMatrix[index+2]),
            currentColor,
            canvasWidthOffset = canvasElement.width * 4;

        queue.push(index);

        // Breadth First Search implemented within a While cycle, It's enough to have white/black state of visit control for this purpose.
        while (queue.length > 0) {

            iterationCount++;
            visitIndex = queue.splice(0, 1)[0];

            // Detecting the current color that is visited, R G B A in linear order
            currentColor = new Color(imageMatrix[visitIndex], imageMatrix[visitIndex+1], imageMatrix[visitIndex+2]);

            // if the current visited image pixel match the color check and it's not already visited let's make it transparent
            if(testColorWithImagePixel(firstColor, currentColor) && !visitControl[visitIndex]) {

                // making the current image pixel transparent
                imageMatrix[visitIndex+3] = 0;

                rightIndex = visitIndex + 4;
                leftIndex = visitIndex - 4;
                topIndex = visitIndex - canvasWidthOffset;
                bottomIndex = visitIndex + canvasWidthOffset;

                // Checking if the right Index is visited and queue its visit
                if(!visitControl[rightIndex])
                    queue.push(rightIndex);

                // Checking the left Index is visited and queue its visit
                if(!visitControl[leftIndex])
                    queue.push(leftIndex);

                // checking the Top Index is visited and queue its visit
                if(!visitControl[topIndex])
                    queue.push(topIndex);

                // checking the Bottom Index is visited and queue its visit
                if(!visitControl[bottomIndex])
                    queue.push(bottomIndex);

            }

            // Flag the pixel visitControl as checked
            visitControl[visitIndex] = true;
        }

        console.log( (new Date().getTime() - start) + 'ms to execute, visiting ' + iterationCount + ' image pixels, tollerance: ' + that.tollerance);

        _canvasContext.putImageData(imageData, 0, 0, 0, 0, canvasElement.width, canvasElement.height);

        that.history.push(canvasElement.toDataURL());

        that.stateChanged.call(that);
    }

    /**
     * function used to compare the current visited color with the selected color to check, considering the tollerance value.
     * @param {Color} firstColor, selected color to compare.
     * @param {Color} color, current visited color.
     * @return {boolean}
     */
    function testColorWithImagePixel(firstColor, color) {
        return (firstColor.red - that.tollerance) <= color.red && color.red <= (firstColor.red + that.tollerance) &&
               (firstColor.green - that.tollerance) <= color.green && color.green <= (firstColor.green + that.tollerance) &&
               (firstColor.blue - that.tollerance) <= color.blue && color.blue <= (firstColor.blue + that.tollerance)
    }

    /**
     * function used to render into the canvas an imageData.
     * @param {string} imageData, base64 Image data.
     */
    this.renderImage = function(imageData) {
        var image = new Image();
        image.src = imageData;
        _canvasContext.drawImage(image, 0, 0);
    };

}

MagicEraser.prototype = {

    /**
     * back function used to restore the previous state of the image.
     */
    back : function() {
        this.history.pop();
        var lastState = this.history.last();
        this.stateChanged.call(this);
        if(lastState)
            this.renderImage(lastState);
    },

    /**
     * history Queue FIFO instance where to store the image states.
     * @see Queue
     * @type {Queue}
     */
    history : new Queue(5),

    /**
     * reset function used to restore the oldest available state of the image.
     */
    reset : function() {
        var firstEntry = this.history[0];
        if(firstEntry) {
            this.history = new Queue(5);
            this.history.push(firstEntry);
            this.stateChanged.call(this);
            this.renderImage(firstEntry);
        }
    },

    /**
     * stateChanged function fired when the image state is udpated.
     */
    stateChanged : function() {},

    /**
     * tollerance setting value, used to set the setting of the RGB channels range of validity during the BFS search.
     * @type {number}
     */
    tollerance : 0

};








