import openai

openai.api_key = "TU_API_KEY"

response = openai.images.generate(
  model="dall-e-3",
  prompt="تصميم فريد لغلاف كتاب عن الذكاء الاصطناعي والمستقبل، بأسلوب فني حديث",
  n=1,
  size="1024x1024"
)

image_url = response.data[0].url
print("URL de la imagen generada:", image_url)