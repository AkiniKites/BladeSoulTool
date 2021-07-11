using System.Drawing;
using System.Drawing.Imaging;

namespace BladeSoulTool.lib
{
    public class BstGifImage
    {
        private readonly Image _gifImage;
        private readonly FrameDimension _dimension;
        private readonly int _frameCount;
        private int _currentFrame = -1;
        private bool _reverse;
        private int _step = 1;

        public BstGifImage(string path)
        {
            _gifImage = Image.FromFile(path); // initialize
            _dimension = new FrameDimension(_gifImage.FrameDimensionsList[0]); // gets the GUID
            _frameCount = _gifImage.GetFrameCount(_dimension); // total frames in the animation
        }

        public bool ReverseAtEnd
        {
            // whether the gif should play backwards when it reaches the end
            get { return _reverse; }
            set { _reverse = value; }
        }

        public Image GetNextFrame()
        {

            _currentFrame += _step;

            // if the animation reaches a boundary ...
            if (_currentFrame >= _frameCount || _currentFrame < 1)
            {
                if (_reverse)
                {
                    _step *= -1;
                    // ... reverse the count
                    // apply it
                    _currentFrame += _step;
                }
                else
                {
                    //...or start over
                    _currentFrame = 0;
                }
            }
            return GetFrame(_currentFrame);
        }

        public Image GetFrame(int index)
        {
            _gifImage.SelectActiveFrame(_dimension, index); // find the frame
            return (Image) _gifImage.Clone(); // return a copy of it
        }
    }
}
